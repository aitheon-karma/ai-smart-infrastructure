export const environment = {
  /**
   * Identify itself. Current MicroService Name and ID in Database
   */
  service: {
    _id: 'SMART_INFRASTRUCTURE',
    name: 'smart-infrastructure',
    url: '/smart-infrastructure',
    description: 'smart-infrastructure',
    serviceType: 'any',
    envStatus: 'ALPHA',
    iconClass: 'fa fa-comments'
  },
  /**
   * App running port
   */
  port: process.env.PORT || 3000,
  /**
   * App environment
   */
  production: false,
  /**
   * Logger
   */
  log: {
    format: process.env.LOG_FORMAT || 'combined',
    fileLogger: {
      level: 'debug',
      directoryPath: process.env.LOG_DIR_PATH || (process.cwd() + '/logs/'),
      fileName: process.env.LOG_FILE || 'app.log',
      maxsize: 10485760,
      maxFiles: 2,
      json: false
    }
  },
  /**
   * Database connection information
   */
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost/isabel'
  },
  mailer: {
    host: 'localhost',
    port: '2525',
    from: '"DEV Isabel - FedoraLabs" <no-reply@testingdomain.io>',
    auth: {
      user: process.env.MAILER_EMAIL_ID || 'testuser',
      pass: process.env.MAILER_PASSWORD || '9j8js7pi37a4'
    },
    tls: {
      rejectUnauthorized: false
    }
  },
  authURI: `https://dev.aitheon.com/auth`,
  deviceManagerURI: `https://${process.env.DOMAIN || 'dev.aitheon.com'}/device-manager`,
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || `amqp://ai-rabbit:Ne&ZTeFeYCqqQRK3s7qF@localhost:5672`
  },


  // Autodesk fordge confuguration
  autoDesk: {
    clientSecret: '4vBZDN1VKFzV3Tnl',
    clientId: 'JDK94teTpOao7YtYR3JnWPdE9H1UV3MZ',
    bucketName: 'aitheon2',
    baseUrl: 'https://developer.api.autodesk.com'
  },
  aws_s3: {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAJ4SOUDVXZNLMVWWA',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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',
    },
    bucket: process.env.AWS_SECRET_ACCESS_KEY || 'isabel-data'
  },

};
