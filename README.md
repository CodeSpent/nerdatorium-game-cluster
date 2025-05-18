# Game Server Cluster

A scalable, automated game server hosting solution built with AWS CDK and TypeScript.

## Features

- Multi-game support with independent configurations
- Automatic game server deployment and management
- Persistent storage for game saves
- Auto-shutdown functionality
- API for server management
- Elastic IPs for stable connectivity
- Development environment support

## Prerequisites

- Node.js 16.x or higher
- AWS CLI configured with appropriate permissions
- AWS CDK installed globally
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd game-server-cluster
```

2. Install dependencies:
```bash
npm install
```

3. Configure AWS credentials:
```bash
aws configure
```

## Configuration

The project uses a hierarchical configuration system:

1. Cluster-wide configuration (`config.ts`):
   - Infrastructure settings (AWS region, account, etc.)
   - Network configuration
   - AWS service defaults
   - Global features

2. Game-specific configuration:
   - Located in `cluster/games/<game-name>/<game-name>.config.ts`
   - Contains game-specific settings
   - Inherits cluster-wide defaults

## Adding a New Game

1. Create a new directory for your game:
```bash
mkdir -p cluster/games/<game-name>
```

2. Create the game configuration file:
```typescript
// cluster/games/<game-name>/<game-name>.config.ts
export const <GameName>Config = {
  // Game configuration
  game: {
    useExperimentalBuild: false
  },

  // Instance configuration
  instance: {
    type: "c5.large",  // Recommended instance type
    storage: {
      rootVolume: {
        sizeGB: 10,
        deviceName: "/dev/sda1"
      }
    }
  },

  // Network configuration
  securityGroup: {
    description: "Allow <GameName> server connections",
    ports: {
      game: {
        port: <game-port>,
        protocol: "udp"
      }
    }
  },

  // Save bucket configuration
  saveBucket: {
    name: "<game-name>-saves",
    allowPublicAccess: false
  },

  // Startup configuration
  startup: {
    installScriptPath: "scripts/install.sh",
    autoShutdownScriptPath: "scripts/auto-shutdown.sh"
  },

  // API configuration
  api: {
    enabled: true,
    timeoutSeconds: 10
  }
};
```

3. Create installation script:
```bash
// cluster/games/<game-name>/scripts/install.sh
#!/bin/bash

# Add your game installation steps here
```

4. Create auto-shutdown script (optional):
```bash
// cluster/games/<game-name>/scripts/auto-shutdown.sh
#!/bin/bash

# Add your game-specific shutdown logic here
```

5. Create game stack:
```typescript
// cluster/games/<game-name>/<game-name>.stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { <GameName>Config } from './<game-name>.config';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_assets from 'aws-cdk-lib/aws-s3-assets';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigw from 'aws-cdk-lib/aws-apigateway';

export class <GameName>GameServerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    // Your game-specific stack implementation here
  }
}
```

## Deployment

1. Deploy the cluster:
```bash
cdk deploy
```

2. Deploy a specific game:
```bash
cdk deploy <GameName>GameServerStack
```

3. Deploy the development environment:
```bash
cdk deploy <GameName>GameServerDevStack
```

## Development

1. Create a development configuration:
```typescript
// cluster/games/<game-name>/<game-name>.dev.config.ts
export const <GameName>DevConfig = {
  // Similar to production config but with development settings
  instance: {
    type: "c5.large",  // Smaller instance for dev
    storage: {
      rootVolume: {
        sizeGB: 10
      }
    }
  },
  saveBucket: {
    name: "<game-name>-dev-saves"
  }
};
```

2. Create a development stack:
```typescript
// cluster/games/<game-name>/<game-name>.dev.stack.ts
import { <GameName>DevConfig } from './<game-name>.dev.config';

export class <GameName>GameServerDevStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    // Use dev config instead of production config
  }
}
```

## Best Practices

1. Keep game-specific configurations in their respective directories
2. Use cluster-wide configuration for shared settings
3. Always test changes in development environment first
4. Use descriptive resource names with the cluster prefix
5. Maintain consistent security group rules
6. Regularly backup game save files

## Security

- All resources are created with least privilege access
- Security groups are configured with minimum necessary ports
- IAM roles are scoped to specific actions
- S3 buckets are configured with versioning and lifecycle rules

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License - see LICENSE file for details
