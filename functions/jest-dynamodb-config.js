/* eslint-disable @typescript-eslint/no-var-requires */
const yaml = require('js-yaml');
const fs = require('fs');

const templateYaml = fs.readFileSync('../template.yaml', 'utf8').replace(/!(Ref|Sub)/g, '$1');

const { Resources } = yaml.load(templateYaml);
const tables = Object.entries(Resources)
    .filter((res) => /^[a-zA-Z0-9]+Table$/u.test(res[0]))
    .map((res) => res[1].Properties);

module.exports = { tables };
