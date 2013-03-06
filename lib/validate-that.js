var validateThat;

(function () {

  validateThat = function (data, stopOnFail) {
    return new Validator(data, stopOnFail);
  };

  var Validator = function (data, stopOnFail) {
    if (typeof data === "boolean") {
      stopOnFail = data;
      data = null;
    }
    this.data = data;
    this.stopOnFail = stopOnFail;
    this.checkPoints = [];
    if (this.data !== undefined && this.data !== null) {
      this.errors = {};
      this.dataPolicy = obtainDataPolicy(data);
    }
  };

  Validator.prototype.validate = function (data) {
    delete this.stop;
    this.data = data;
    this.errors = {};
    this.dataPolicy = obtainDataPolicy(data);

    for (var i = 0; i < this.checkPoints.length; i++) {
      var checkPoint = this.checkPoints[i];
      if ("function" === typeof checkPoint) checkPoint.apply(this);
      if (this.stop) break;
    }
    return this;
  };

  function addErrors(errors, newErrors) {
    for (var prop in newErrors) {
      if (!(prop in errors)) {
        errors[prop] = [];
      }
      errors[prop] = errors[prop].concat(newErrors[prop]);
    }
  }

  function obtainDataPolicy(data) {
    var checkingHandler;
    if (typeof data === "object") {
      if (data instanceof Array) checkingHandler = handleValueArrayChecking;
      else checkingHandler = handleObjectChecking;
    } else {
      checkingHandler = handleValueChecking;
    }

    return function (check, props) {
      if (this.stop) return;
      var result = checkingHandler.call(this, check, props);
      var error;
      if (!result) {
        if (this.stopOnFail) this.stop = true;
        addErrors(this.errors, check.errors);
        delete check.errors;
      }
    };
  }

  var handleValueChecking,
      handleValueArrayChecking,
      handleObjectChecking;
  (function() {
    function putError(check, value, prop, checkArgs) {
      var type = check.name || check.otherName;
      var error = { value: value };
      if (undefined !== prop) error.prop = prop;
      if (undefined !== checkArgs) error.args = checkArgs;
      if (!check.errors) check.errors = {};
      if (!(type in check.errors)) check.errors[type] = [];
      check.errors[type].push(error);
    }

    handleValueChecking = function (check) {
      var result = check(this.data);
      if (!result) putError(check, this.data);
      return result;
    }

    handleValueArrayChecking = function (check) {
      var result = true;
      var oneResult;
      for (var i = 0; i < this.data.length; i++) {
        oneResult = check(this.data[i]);
        if (!oneResult) {
          putError(check, this.data[i], i);
          if (this.stopOnFail) return false;
        }
        result = result && oneResult;
      }
      return result;
    }

    function handlePropertyChecking(check, prop) {
      var result = check(this.data[prop]);
      if (!result) putError(check, this.data[prop], prop, check.checkArgs);
      return result;
    }

    handleObjectChecking = function (check, props) {
      var result = true,
          mustExclude = false,
          prop;

      if (props instanceof Array) {
        for (var i = 0; i < props.length; i++) {
          prop = props[i];
          result = handlePropertyChecking.call(this, check, prop) && result;
          if (!result && this.stopOnFail) return false;
        }
      } else {
        mustExclude = props && props.exclude && props.exclude.length > 0;
        for (prop in this.data) {
          if (mustExclude && props.exclude.indexOf(prop) !== -1) continue; 
          result = handlePropertyChecking.call(this, check, prop) && result;
          if (!result && this.stopOnFail) return false;
        }
      }
      return result;
    }
  }).call();

  function checkCloseOverArgs(check, args) {
    if (!args) return check;
    var newCheck = function (value) {
      return check.apply(null, [value].concat(args));
    };
    newCheck.otherName = check.name;
    newCheck.checkArgs = args;
    return newCheck;
  }

  function setupCheckPoint(simpleCheck, checkArgsLength, defaultProps) {
    if (defaultProps && "object" !== typeof defaultProps) {
      throw new Error('defaultProps must be an array or an object');
    }
    return function () {
      var innerCheck = simpleCheck,
          props,
          checkArgs;
      if (undefined === this.checkPoints.lastPropsIndex) props = defaultProps;
      else {
        props = this.checkPoints[this.checkPoints.lastPropsIndex];
      }

      if (checkArgsLength) checkArgs = Array.prototype.slice.call(arguments, 0, checkArgsLength);
      innerCheck = checkCloseOverArgs(innerCheck, checkArgs);

      if (arguments.length > checkArgsLength) {
        if (arguments.length === checkArgsLength + 1 && "object" === typeof arguments[checkArgsLength]) {
            props = arguments[checkArgsLength];
        }
        else props = Array.prototype.slice.call(arguments, checkArgsLength);
      }

      function dataPolicyCloseOver() {
        this.dataPolicy(innerCheck, props);
      }

      if (this.dataPolicy) dataPolicyCloseOver.call(this);
      this.checkPoints.push(dataPolicyCloseOver);
      return this;
    };
  }

  /** String, array, and not null. **/
  function notEmpty(value) {
    if ("string" === typeof value) return value.trim().length > 0;
    if ("number" === typeof value) return true;
    if (value instanceof Array) return value.length > 0;
    return !!value;
  }

  /** more practical implementation of RFC 2822 **/
  function email(email) {
    var reg = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9][a-z0-9-]*[a-z0-9]/
    return reg.test(email);
  }

  function minLength(value, min) {
    if ("string" === typeof value) return value.length >= min;
    if (value instanceof Array) return value.length >= min;
    return false;
  }

  function maxLength(value, max) {
    if ("string" === typeof value) return value.length <= max;
    if (value instanceof Array) return value.length <= max;
    return false;
  }

  Validator.prototype.prop = function (prop) {
    return this.props(prop);
  };

  Validator.prototype.props = function () {
    var props;
    if (arguments.length === 1 && "object" === typeof arguments[0]) props = arguments[0];
    else props = Array.prototype.slice.call(arguments, 0);
    this.checkPoints.lastPropsIndex = this.checkPoints.push(props) - 1;
    return this;
  };

  Validator.prototype.notEmpty = setupCheckPoint(notEmpty, 0);
  Validator.prototype.minLength = setupCheckPoint(minLength, 1);
  Validator.prototype.maxLength = setupCheckPoint(maxLength, 1);
  Validator.prototype.email = setupCheckPoint(email, 0, ['email']);

}).call();

if (typeof exports !== "undefined") exports.validateThat = validateThat;
