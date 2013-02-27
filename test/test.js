var should = require('chai').should(),
    validateThat = require('..').validateThat;

function error(type, value, prop, args) {
  var error = { type: type, value: value };
  if (undefined !== prop) error.prop = prop;
  if (undefined !== args) error.args = args;
  return error;
}

describe('validateThat()', function() {
  var validator = validateThat();
  it('should return a validator object without the "errors" property', function() {
    validator.should.be.a('object');
    validator.should.have.property('validate');
    validator.validate.should.be.a('function');
    validator.should.not.have.property('errors');
  });

});

describe('validateThat(data)', function() {
  var data = 'data';
  var validator = validateThat(data);
  it('should return a validator object with the "errors" property', function() {
    validator.should.be.a('object');
    validator.should.have.property('validate');
    validator.validate.should.be.a('function');
    validator.should.have.property('errors');
  });
});

describe('validateThat(true)', function() {
  describe('validates until it find the first error', function() {
    var validator = validateThat(true).maxLength(100).notEmpty().email().minLength(100);
    it('for a primitive value', function() {
      validator.validate('');
      validator.errors.should.be.eql([ error('notEmpty', '') ]);
    });

    it('for an array of primitives value', function() {
      var value = ['js', '2', '', [], ''];
      validator.validate(value);
      validator.errors.should.be.eql([ error('notEmpty', '', 2) ]);
    });

    it('for an object', function() {
      var value = { x: 'x', email:'ex@example.com', empty:[], a:'', n:null };
      validator.validate(value);
      validator.errors.should.be.eql([ error('maxLength', null, 'n', [100]) ]);
    });
  });
});

describe('validateThat(data, true)', function() {
  it('for a primitive value', function() {
    var validator = validateThat([1], true).notEmpty().maxLength(0).minLength(2);
    validator.errors.should.be.eql([ error('maxLength', 1, 0) ]);
  });

  it('for an array of primitives value', function() {
    var value = ['js', '2', '', [], ''];
    var validator = validateThat(value, true).minLength(100).email().notEmpty();
    validator.errors.should.be.eql([ error('minLength', 'js', 0) ]);
  });

  it('for an object', function() {
    var value = { x: 'x', email:'ex@example.com', empty:[], a:'', n:null };
    var validator = validateThat(value, true).email().maxLength(1).notEmpty();
    validator.errors.should.be.eql([ error('maxLength', value.email, 'email', [1]) ]);
  });
});

describe('validator', function() {
  describe('#anyCheck()', function() {
    describe('for an object value', function() {
      var value = { email:"darken.dev@gmail.com", e:"node.js", nums:[0,1,2] };

      describe('with a props argument = { exclude: propsExcludedArray },', function() {
        describe('excludes from validation', function() {
          it('none property, if the array is empty', function() {
            var validator = validateThat(value).prop({ exclude: [] }).notEmpty().email();
            validator.errors.length.should.be.equal(2);
          });
          
          it('the properties defined in the array', function() {
            var validator = validateThat(value).prop({ exclude: ['nums'] }).notEmpty().email();
            validator.errors.length.should.be.equal(1);
          });
        });
      });
    });
  });
});

describe('validator', function() {
  var value = { a:'@', b:[], y:[], z:'' };
  describe('#props()', function() {
    it('arguments must be the only properties checked by checkPoints defined after', function() {
      var validator = validateThat(value).props('b', 'z').notEmpty().props('a');
      validator.errors.should.be.eql([ error('notEmpty', value.b, 'b'), error('notEmpty', value.z, 'z') ]);
    });

    it("arguments must be overridden by the checkPoint's definition properties", function() {
      var validator = validateThat(value).props('y').props(['b', 'z']).minLength(1, 'a').minLength(1);
      validator.props({ exclude: ['a', 'b', 'y', 'z'] }).notEmpty();

      validator.errors.should.be.eql([
                                     error('minLength', value.b, 'b', [1]),
                                     error('minLength', value.z, 'z', [1]) ]);
    });
  });

  describe('#prop()', function() {
    var validator = validateThat();
    it('first parameter must be the only one checked', function() {
      var validator = validateThat(value).prop('z', 'b').notEmpty();
      validator.prop({exclude:['a', 'y', 'z']}, {exclude:[]}).notEmpty().props();

      validator.errors.should.be.eql([ error('notEmpty', value.z, 'z'), error('notEmpty', value.b, 'b') ]);
    });

    it("argument override the checkPoint's default property", function() {
      var validator = validateThat(value).prop('y').email();
      validator.props({ exclude: ['a', 'b', 'y', 'z'] }).email();

      validator.errors.should.be.eql([ error('email', value.y, 'y') ]);
    });
  });
});

describe('validator', function() {
  describe('#notEmpty()', function() {
    var validator = validateThat().notEmpty();
    it('for value = "" should have one error', function() {
      validator.validate('');
      validator.errors.length.should.be.equal(1);
    });

    it('for value = [ [], "" ] should have two errors', function() {
      validator.validate([[], '']);
      validator.errors.length.should.be.equal(2);
    });

    it('for value = { a:[], b:"", c:null, d:{} } should have three errors', function() {
      validator.validate({ a:[], b:'', c:null, d:{} });
      validator.errors.length.should.be.equal(3);
      validator.errors[0].should.be.eql(error('notEmpty', [], 'a'));
    });
  });

  describe('#notEmpty("b")', function() {
    var validator = validateThat().notEmpty('b');
    it('for value = { a:[], b:"", c:null, d:{} } should have one error', function() {
      validator.validate({ a:[], b:'', c:null, d:{} });
      validator.errors.length.should.be.equal(1);
      validator.errors[0].should.be.eql(error('notEmpty', '', 'b'));
    });
  });
});

describe('validator', function() {
  describe('#minLength(3, "a")', function() {
    var value = { a: [0,1,2], b:3 };
    var validator = validateThat(value).minLength(3, 'a');
    it('for value = { a: [0,1,2], b:3 } should not have errors', function() {
      validator.errors.length.should.be.equal(0);
    });

    it('for value = { a: "01", b:3 } should have one error', function() {
      value.a = '01';
      validator.validate(value);
      validator.errors.should.be.eql([ error('minLength', value.a, 'a', [3]) ]);
    });
  });

  describe('#minLength(10)', function() {
    var validator = validateThat().minLength(10);
    it('for value = { z:10 } should have one error', function() {
      var value = { z:10 };
      validator.validate(value);
      validator.errors.should.be.eql([ error('minLength', value.z, 'z', [10]) ]);
    });
  });
});

describe('validator', function() {
  describe('#maxLength(10)', function() {
    var value = '01234567890';
    var validator = validateThat(value).maxLength(10);
    it('should have one error', function() {
      validator.errors.should.be.eql([ error('maxLength', value) ]);
    });

    it('should not have errors', function() {
      validator.validate([[]]);
      validator.errors.length.should.be.equal(0);
    });
  });

  describe('#maxLength(2)', function() {
    var value = { f: 1 };
    var validator = validateThat().maxLength(2).validate(value);
    it('for value = { f: 1 } should have one error', function() {
      validator.errors.should.be.eql([ error('maxLength', value.f, 'f', [2]) ]);
    });
  });
});

describe('validator', function() {
  describe('#email()', function() {
    describe('with a primitive value', function() {
      var validator = validateThat().email();

      it('that is valid should have no errors', function() {
        var value = 'ex4mpl3@exampl3.com.co';
        validator.validate(value);
        validator.errors.length.should.be.equal(0);

        value = 'darken.dev@gmail.com';
        validator.validate(value);
        validator.errors.length.should.be.equal(0);

        value = 'da/rken.dev@gmail.com';
        validator.validate(value);
        validator.errors.length.should.be.equal(0);
      });

      it('that is not valid should have one error', function() {
        var value = '@example.com.co';
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = 1337;
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = 'example@gmail.c';
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = 'darken@';
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = 'example@.';
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = 'da\\ken@gmail.com';
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = '';
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);

        value = false;
        validator.validate(value);
        validator.errors.should.be.eql([ error('email', value) ]);
      });
    });

    describe('with an array of primitive values', function() {
      var validator = validateThat().email();

      it('that are valid, should have no errors', function() {
        var value = [ 'ex4mpl3@ex.ampl3.com.co', 'd@com.com', '1@e.gov', '_@a-a.gov.co.xo', '12@1.co' ];
        validator.validate(value);
        validator.errors.length.should.be.equal(0);
      });

      it('that are not valid, should have errors', function() {
        var value = [ 'ex4mpl3@.co', 'a@-.com', '1@e', '_-.gov.co', '12@co', 'd@.com.com', 'a@_.gov.co',
          false, undefined, null, 0, '' ];
        validator.validate(value);
        validator.errors.length.should.be.equal(value.length);
      });
    });

    describe('with an object that has', function() {
      it('the property email with a valid value, should have no errors', function() {
        var value = { email: 'coolemail@example.com' };
        var validator = validateThat(value).email();
        validator.errors.length.should.be.equal(0);
      });

      it('the property email with a not valid value, should have one error', function() {
        var value = { email: 'coolemailexample.com' };
        var validator = validateThat(value).email();
        validator.errors.length.should.be.equal(1);
      });

      it('valid properties, should have no errors', function() {
        var value = { a:'ex4mpl3@ex.ampl3.com.co', b:'d@com.com', c:'_@a-a.gov.co.xo', d:'12@1.co' };
        var validator = validateThat(value).props({ exclude:[] }).email();
        validator.errors.length.should.be.equal(0);
      });

      it('not valid properties, should have errors', function() {
        var value = { a:'ex4mpl3@.co', b:123, c:null, d:{}, e:[], f:false, g:true, h:undefined, i:0,
          j:'' };
        var validator = validateThat().email({ exclude:[] }).validate(value);
        validator.errors.length.should.be.equal(10);
      });

      it('not valid properties, should have errors', function() {
        var value = { a:'ex4mpl3@.co', b:123, c:null, d:{}, e:[], f:false, g:true, h:undefined, i:0,
          j:'' };
        var exclude = ['b', 'd', 'e', 'g', 'h', 'i' ];
        var validator = validateThat().email({ exclude: exclude }).validate(value);
        validator.errors.length.should.be.equal(4);
      });

      it('not valid properties, should have errors', function() {
        var value = { a:'ex4mpl3@.co', b:123, c:null, d:{}, e:[], f:false, g:true, h:undefined, i:0,
          j:'' };
        var props = ['a', 'c', 'd', 'g', 'h', 'i'];
        var validator = validateThat().email(props).validate(value);
        validator.errors.length.should.be.equal(props.length);
      });
    });
  });
});