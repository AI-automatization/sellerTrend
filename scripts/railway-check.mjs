import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('C:/Users/User/.railway/config.json', 'utf8'));
const TOKEN = config.user.token;

const graphql = async (query, variables = {}) => {
  const res = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
};

const PROJECT_ID = '156c67d6-cbf0-469e-b24a-294a3ee62fe1';

const result = await graphql(`
  mutation {
    projectTokenCreate(input: {
      projectId: "${PROJECT_ID}",
      name: "deploy-landing-cli",
      environmentId: "5778ea55-6c15-4d2a-982d-5da2703fb386"
    })
  }
`);

console.log('Token result:', JSON.stringify(result, null, 2));
