const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'API Ecommerce',
    description: 'Documentação automática do Swagger'
  },
  host: `localhost:${process.env.PORT || 3001}`,
  schemes: ['http']
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js', './routes/*.js'];

console.log('Gerando documentação Swagger...');
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log(`Documentação Swagger gerada em ${outputFile}`);
}); 