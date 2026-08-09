module.exports = {
  apps: [
    {
      name: 'horizonecole-api',
      script: './apps/api/dist/index.js',
      cwd: '/var/www/horizonecole',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001,
      },
      error_file: '/var/log/horizonecole/api-error.log',
      out_file: '/var/log/horizonecole/api-out.log',
      time: true,
      restart_delay: 3000,
      max_restarts: 10,
      watch: false,
    },
  ],
};
