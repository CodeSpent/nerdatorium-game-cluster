export const SatisfactoryConfig = {
  // Meta configuration
  prefix: "Satisfactory",

  // Game configuration
  game: {
    useExperimentalBuild: false
  },

  // Instance configuration
  instance: {
    type: "c6i.xlarge", 
    vpcId: "",
    subnetId: "",
    availabilityZone: "",
    storage: {
      rootVolume: {
        sizeGB: 15,
        deviceName: "/dev/sda1"
      }
    },
    elasticIp: {
      associate: true,
      allowReassociation: true
    }
  },

  // Network configuration
  securityGroup: {
    description: "Allow SatisfactoryGameServerInstanceRole connect to server.",
    ports: {
      game: {
        port: 7777,
        protocol: "udp"
      },
      api: {
        port: 7777,
        protocol: "tcp"
      },
      beacon: {
        port: 15000,
        protocol: "udp"
      },
      query: {
        port: 15777,
        protocol: "udp"
      }
    }
  },

  // Save bucket configuration
  saveBucket: {
    name: "", // Leave empty to create a new bucket (initially)
    allowPublicAccess: false
  },

  // Startup configuration
  startup: {
    awsCli: {
      install: true
    },
    installScriptPath: "cluster/games/satisfactory/scripts/install.sh",
    autoShutdownScriptPath: "cluster/games/satisfactory/scripts/auto-shutdown.sh"
  },

  // API configuration
  api: {
    enabled: true,
    timeoutSeconds: 10,
    description: "Trigger lambda function to start server"
  }
};
