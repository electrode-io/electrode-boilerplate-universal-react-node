"use strict";

/* eslint-disable arrow-parens */

var Generator = require("yeoman-generator");
var chalk = require("chalk");
var yosay = require("yosay");
var path = require("path");
var _ = require("lodash");
var extend = _.merge;
var parseAuthor = require("parse-author");
var githubUsername = require("github-username");
var glob = require("glob");
var nodeFS = require("fs");
var demoHelperPath = require.resolve("electrode-demo-helper");

/*
* This generator should check that it is invoked from within a packages folder
* so check if cwd ends in packages. also that there is a demo-app folder present
* demo app folder path should be at the same level as packages.
* then check if 'demo-app/package.json' and 'demo-app/src/client/components/home.jsx' exist.
* The folder structure is now sufficiently verified.
* generate the component in the cwd and npmi
* modify the demo-app package to add new package.
* modify the demo-app component home.jsx to import the new packages/component and use class in the div
*/

module.exports = class extends Generator {
  constructor(args, options) {
    super(args, options);

    this.packageName = this.options.packageName || "demo-app";
    this.developerName = this.options.developerName || "demoDeveloper";
    this.className = this.options.className;
  }

  initializing() {
    let appPkgPath = "";
    let homeComponentPath = "";
    this.demoAppName = "";

    const checkError = () => {
      if (_.isEmpty(this.demoAppName)) {
        this.env.error(
          "We could not find your demo-app. Make sure your directory structure is preserved after running 'yo electrode-component'."
        );
      }
      if (!this.pkg) {
        this.env.error(
          "We could not find package.json for your demo-app. Make sure your directory structure is preserved after running 'yo electrode-component'."
        );
      }
      if (!this.homeComponent) {
        this.env.error(
          "We could not find home.jsx for your demo-app. Make sure your directory structure is preserved after running 'yo electrode-component'."
        );
      }
    };

    // Check if the command is being run from within an existing app
    if (this.fs.exists(this.destinationPath("package.json"))) {
      var appPkg = this.fs.readJSON(this.destinationPath("package.json"));
      if (
        !_.isEmpty(appPkg.dependencies) &&
        _.includes(Object.keys(appPkg.dependencies), "electrode-archetype-react-app")
      ) {
        this.env.error(
          "Please do not run this command from within an application." +
            "\nYou need to run this command from the 'packages' folder generated by running 'yo electrode:component'."
        );
      }
    }

    // Check is the command is run from the correct directory
    if (path.basename(this.destinationPath()) != "packages") {
      this.env.error(
        "You need to run this command from the 'packages' folder generated by running 'yo electrode:component'."
      );
    }

    try {
      // Fetch the demo App Name, which is "demo-app" by default
      this.demoAppName = _.first(glob.sync("**demo-app", { cwd: path.resolve("..") }));
      this.pkg = this.fs.exists(
        this.destinationPath(path.join("..", this.demoAppName, "package.json"))
      );
      this.homeComponent = this.fs.exists(
        this.destinationPath(
          path.join("..", this.demoAppName, "src", "client", "components", "home.jsx")
        )
      );
    } catch (e) {
      checkError();
    }

    checkError();
    this.props = this.options.props || {};
  }

  _askFor() {
    var prompts = [
      {
        type: "input",
        name: "name",
        message: "Component Name",
        when: !this.props.name,
        default: "untitled" + Math.floor(Math.random() * 1000) + "-component"
      },
      {
        type: "input",
        name: "componentName",
        message: "What is the ClassName for your component?",
        default: this.props.name,
        when: !this.props.componentName
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = extend(this.props, props);
      this.packageName = this.props.name;
      this.componentName = _.kebabCase(_.deburr(this.props.componentName || this.props.name))
        .replace(/^\s+|\s+$/g, "")
        .replace(/(^|[-_ ])+(.)/g, function(match, first, second) {
          return second.toUpperCase();
        });
    });
  }

  prompting() {
    this.log(yosay("Welcome to the " + chalk.red("Electrode Add Component") + " generator!"));

    return this._askFor();
  }

  default() {
    let options = {
      isAddon: true,
      name: this.packageName,
      componentName: this.componentName,
      demoAppName: this.demoAppName,
      quotes: this.props.quotes
    };

    this.composeWith(require.resolve("../component"), options);
  }

  writing() {
    let getDemoFilePath = function(filepath) {
      try {
        let demoFilePath = path.resolve(demoHelperPath, "..", filepath);
        return demoFilePath;
      } catch (e) {
        console.log(e);
      }
    };

    // Overwrite the Demo App package.json
    let existingPkg = this.fs.readJSON(
      this.destinationPath(path.join("..", "..", this.demoAppName, "package.json"))
    );
    existingPkg.dependencies[this.packageName] = path.join("..", "packages", this.packageName);

    this.fs.writeJSON(
      this.destinationPath(path.join("..", "..", this.demoAppName, "package.json")),
      existingPkg
    );

    let homeFile = this.fs.read(
      this.destinationPath(
        path.join("..", "..", this.demoAppName, "src", "client", "components", "home.jsx")
      )
    );

    let homeArray = homeFile.split("\n");
    // Add import at the top
    let rx = "import {" + this.componentName + '} from "' + this.packageName + '";';
    let rxTag = "<" + this.componentName + " />";
    homeArray.unshift(rx);

    // Get the first closing div, home shoud have one closing div.
    let splitPoint = homeArray.findIndex((value, index, array) => {
      if (value.match("</div>")) {
        return index;
      }
    });

    // Insert the new class before the div
    // Splice the array into 2, before closing div and after
    let topHalf = homeArray.splice(0, splitPoint);
    topHalf.push(rxTag);
    let newHomeString = topHalf.concat(homeArray).join("\n");

    this.fs.write(
      this.destinationPath(
        path.join("..", "..", this.demoAppName, "src", "client", "components", "home.jsx")
      ),
      newHomeString
    );

    let directories = nodeFS.readdirSync(this.destinationPath(".."));
    this.fs.copyTpl(
      this.templatePath(getDemoFilePath("archetype")),
      this.destinationPath(path.join("..", "..", "demo-app", "archetype")),
      { components: directories }
    );
  }

  end() {
    this.log(
      "\n" +
        chalk.green.underline("Your new Electrode component is ready!") +
        "\n" +
        "\nYour component is in " +
        this.packageName +
        " and your demo app is in ../" +
        this.demoAppName +
        "\n" +
        "\nType 'cd ../" +
        this.demoAppName +
        "' then 'clap dev' to run the development build for the demo app." +
        "\n"
    );
  }
};
