const fse = require('fs-extra');


const files = [
  ["src/assets", "dist/assets/"],
  ["src/database/models", "dist/database/models/"],
  ["src/templates", "dist/templates/"]
];

// cp -rv src/assets dist/ && cp -rv src/database/models dist/database/

const opts = {
  overwrite: true,
  errorOnExist: false
};

try {
  for (let i = 0; i < files.length; i++) {
    let f = files[i];
    fse.removeSync(f[1]); // remove existing
    fse.copySync(f[0], f[1], opts);
  }
} catch (err) {
  console.error(err);
}

console.log("copied assets");

