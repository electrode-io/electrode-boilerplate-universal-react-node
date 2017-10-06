'use strict';
var Generator = require('yeoman-generator');

module.exports = class extends Generator {
  constructor(args, options) {
    super(args, options);

    this.option('generateInto', {
      type: String,
      required: false,
      defaults: '',
      desc: 'Relocate the location of the generated files.'
    });

    this.option('pwa', {
      type: String,
      required: true,
      desc: 'Progressive Web App'
    });
  }

  writing() {
    const isHapi = this.config.get('serverType') === 'hapijs';
    
    if (!this.fs.exists(this.destinationPath('src/server/views/index-view.jsx'))) {
      this.fs.copy(
        this.templatePath('src/server/views/index-view.js'),
        this.destinationPath(this.options.generateInto, 'src/server/views/index-view.jsx')
      );
    }

    if (this.options.pwa) {
      this.fs.copy(
        this.templatePath('src/server/plugins/pwa.js'),
        this.destinationPath(this.options.generateInto, 'src/server/plugins/pwa.js')
      );
    }
  }
};
