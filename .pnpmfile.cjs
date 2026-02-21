// Allow build scripts for required packages
function readPackage(pkg, context) {
  return pkg;
}

module.exports = { hooks: { readPackage } };
