import { Duration, Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SatisfactoryConfig } from './satisfactory.config';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class SatisfactoryGameServerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // prefix for all resources in this stack
    const prefix = SatisfactoryConfig.prefix;

    //////////////////////////////////////////
    // Configure server, network and security
    //////////////////////////////////////////

    let lookUpOrDefaultVpc = (vpcId: string): ec2.IVpc => {
      // lookup vpc if given
      if (vpcId) {
        return ec2.Vpc.fromLookup(this, `${prefix}Vpc`, {
          vpcId
        })

        // use default vpc otherwise
      } else {
        return ec2.Vpc.fromLookup(this, `${prefix}Vpc`, {
          isDefault: true
        })
      }
    }

    let publicOrLookupSubnet = (subnetId: string, availabilityZone: string): ec2.SubnetSelection => {
      // if subnet id is given select it
      if (subnetId && availabilityZone) {
        return {
          subnets: [
            ec2.Subnet.fromSubnetAttributes(this, `${SatisfactoryConfig.prefix}ServerSubnet`, {
              availabilityZone,
              subnetId
            })
          ]
        };

        // else use any available public subnet
      } else {
        return { subnetType: ec2.SubnetType.PUBLIC };
      }
    }

    const vpc = lookUpOrDefaultVpc(SatisfactoryConfig.instance.vpcId);
    const vpcSubnets = publicOrLookupSubnet(SatisfactoryConfig.instance.subnetId, SatisfactoryConfig.instance.availabilityZone);

    // configure security group to allow ingress access to game ports
    const securityGroup = new ec2.SecurityGroup(this, `${prefix}ServerSecurityGroup`, {
      vpc,
      description: "Allow Satisfactory client to connect to server",
    })

    // port configuration
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(SatisfactoryConfig.securityGroup.ports.api.port), "API port")
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(SatisfactoryConfig.securityGroup.ports.game.port), "Game port")
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(SatisfactoryConfig.securityGroup.ports.beacon.port), "Beacon port")
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(SatisfactoryConfig.securityGroup.ports.query.port), "Query port")

    // instance configuration
    const server = new ec2.Instance(this, `${prefix}Server`, {
      instanceType: new ec2.InstanceType(SatisfactoryConfig.instance.type),
      machineImage: ec2.MachineImage.fromSsmParameter("/aws/service/canonical/ubuntu/server/20.04/stable/current/amd64/hvm/ebs-gp2/ami-id"),
      // storage for steam, satisfactory and save files
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(SatisfactoryConfig.instance.storage.rootVolume.sizeGB, {
            deleteOnTermination: false,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        }
      ],
      // server needs a public ip to allow connections
      vpcSubnets,
      userDataCausesReplacement: true,
      vpc,
      securityGroup,
    });

    // Create and associate Elastic IP
    const eip = new ec2.CfnEIP(this, `${prefix}EIP`, {
      domain: "vpc",
    });

    // Associate the EIP with the instance
    new ec2.CfnEIPAssociation(this, `${prefix}EIPAssociation`, {
      eip: eip.ref,
      instanceId: server.instanceId,
    });

    // Add output for the Elastic IP
    new CfnOutput(this, `${prefix}ElasticIP`, {
      value: eip.ref,
      description: 'Elastic IP Address for the game server'
    });

    // Add Base SSM Permissions, so we can use AWS Session Manager to connect to our server, rather than external SSH.
    server.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    //////////////////////////////
    // Configure save bucket
    //////////////////////////////

    let findOrCreateBucket = (bucketName: string): s3.IBucket => {
      // if bucket already exists lookup and use the bucket
      if (bucketName) {
        return s3.Bucket.fromBucketName(this, `${prefix}SavesBucket`, bucketName);
      }
      
      // Create a new bucket with versioning enabled and lifecycle rules
      const bucket = new s3.Bucket(this, `${prefix}SavesBucket`, {
        versioned: true,
        removalPolicy: RemovalPolicy.RETAIN,
        autoDeleteObjects: false,
      });
      
      // Add lifecycle rules to keep old versions for 30 days
      bucket.addLifecycleRule({
        enabled: true,
        id: 'SaveFileRetention',
        prefix: '',
        transitions: [
          {
            storageClass: s3.StorageClass.INTELLIGENT_TIERING,
            transitionAfter: Duration.days(30),
          },
        ],
      });
      
      return bucket;
    }

    // allow server to read and write save files to and from save bucket
    const savesBucket = findOrCreateBucket(SatisfactoryConfig.saveBucket.name);
    savesBucket.grantReadWrite(server.role);

    //////////////////////////////
    // Configure instance startup
    //////////////////////////////

    // add aws cli
    // needed to download install script asset and
    // perform backups to s3
    server.userData.addCommands('sudo apt-get install unzip -y')
    server.userData.addCommands('curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && ./aws/install')

    // package startup script and grant read access to server
    const startupScript = new s3_assets.Asset(this, `${SatisfactoryConfig.prefix}InstallAsset`, {
      path: `${SatisfactoryConfig.startup.installScriptPath}`
    });
    startupScript.grantRead(server.role);

    // package auto-shutdown script and grant read access to server
    const autoShutdownScript = new s3_assets.Asset(this, `${SatisfactoryConfig.prefix}AutoShutdownAsset`, {
      path: `${SatisfactoryConfig.startup.autoShutdownScriptPath}`
    });
    autoShutdownScript.grantRead(server.role);

    // download and execute startup script
    // with save bucket name as argument
    const localPath = server.userData.addS3DownloadCommand({
      bucket: startupScript.bucket,
      bucketKey: startupScript.s3ObjectKey,
    });
    server.userData.addExecuteFileCommand({
      filePath: localPath,
      arguments: `${savesBucket.bucketName} ${SatisfactoryConfig.game.useExperimentalBuild}`
    });

    // download and configure auto-shutdown script
    const autoShutdownLocalPath = server.userData.addS3DownloadCommand({
      bucket: autoShutdownScript.bucket,
      bucketKey: autoShutdownScript.s3ObjectKey,
    });
    server.userData.addCommands(`
      sudo cp ${autoShutdownLocalPath} /usr/local/bin/auto-shutdown.sh
      sudo chmod +x /usr/local/bin/auto-shutdown.sh
      sudo systemctl enable auto-shutdown
      sudo systemctl start auto-shutdown
    `);

    //////////////////////////////
    // Add api to start server
    //////////////////////////////

    if (SatisfactoryConfig.api.enabled) {
      const startServerLambda = new lambda_nodejs.NodejsFunction(this, `${SatisfactoryConfig.prefix}StartServerLambda`, {
        entry: "cluster/games/satisfactory/api/index.ts",
        description: "Restart game server",
        timeout: Duration.seconds(SatisfactoryConfig.api.timeoutSeconds),
        environment: {
          INSTANCE_ID: server.instanceId
        }
      })

      startServerLambda.addToRolePolicy(new iam.PolicyStatement({
        actions: [
          'ec2:StartInstances',
        ],
        resources: [
          `arn:aws:ec2:*:${this.account}:instance/${server.instanceId}`,
        ]
      }))

      new apigw.LambdaRestApi(this, `${SatisfactoryConfig.prefix}StartServerApi`, {
        handler: startServerLambda,
        description: "Trigger lambda function to start server",
      })
    }
  }
}