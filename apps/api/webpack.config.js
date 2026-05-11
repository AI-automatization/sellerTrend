const path = require('path');

module.exports = (options) => {
  return {
    ...options,
    // @prisma/client ni bundle qilma — native binary'lari bor
    // playwright ni bundle qilma — chromium-bidi va boshqa CJS/native dependencylari bor
    externals: [
      { '@prisma/client': 'commonjs2 @prisma/client' },
      { 'impit': 'commonjs2 impit' },
      { 'playwright': 'commonjs2 playwright' },
      { 'playwright-core': 'commonjs2 playwright-core' },
    ],
    resolve: {
      ...options.resolve,
      extensions: ['.ts', '.js'],
      alias: {
        ...options.resolve?.alias,
        '@uzum/types': path.resolve(__dirname, '../../packages/types/src'),
        '@uzum/utils': path.resolve(__dirname, '../../packages/utils/src'),
      },
    },
    module: {
      ...options.module,
      rules: [
        // workspace package TypeScript fayllarini ham compile qil
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'tsconfig.json'),
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
  };
};
