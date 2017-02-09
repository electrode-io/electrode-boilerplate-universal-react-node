/**
 * Allows arbitrary fields to be defined or overwritten
 * in a manifest.json file. It takes one argument, which is
 * an object containing the key/value pairs that will be defined
 * (or redefined) in the manifest.json file.
 *
 * If the manifest file is being generated by another webpack plugin,
 * then this plugin should be included *after* this one
 */


function AddManifestFieldsPlugin(fields) {
  this.fields = fields || {};
  this.regex = /manifest\.json/;
};

AddManifestFieldsPlugin.prototype.apply = function(compiler) {
  var regex = this.regex;
  var fields = this.fields;
  compiler.plugin('emit', function(compilation, callback) {
    for (var filename in compilation.assets) {
      if (regex.test(filename)) {
        var manifestAsset = compilation.assets[filename];
        var source = manifestAsset.source();
        var manifest = JSON.parse(source);
        for (var field in fields) {
          manifest[field] = fields[field];
        }
        var newManifestAsset = JSON.stringify(manifest, null, 2);
        compilation.assets[filename] = {
          source: function() {
            return newManifestAsset;
          },
          size: function() {
            return newManifestAsset.length;
          }
        }
      }
    }
    callback();
  });
}

module.exports = AddManifestFieldsPlugin;
