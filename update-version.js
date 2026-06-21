const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, 'app.json');
const pbxprojPath = path.join(__dirname, 'ios/BalancePlanner.xcodeproj/project.pbxproj');

if (!fs.existsSync(appJsonPath)) {
  console.error('app.json not found');
  process.exit(1);
}

if (!fs.existsSync(pbxprojPath)) {
  console.error('project.pbxproj not found');
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const version = appJson.version || '1.0';
const build = appJson.build || 1;

let pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');

// Replace MARKETING_VERSION = ...;
pbxprojContent = pbxprojContent.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
// Replace CURRENT_PROJECT_VERSION = ...;
pbxprojContent = pbxprojContent.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);

fs.writeFileSync(pbxprojPath, pbxprojContent, 'utf8');
console.log(`Successfully updated project.pbxproj to version ${version} (build ${build})`);
