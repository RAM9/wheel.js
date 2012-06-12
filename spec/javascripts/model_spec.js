describe('Wheel.Model', function() {
  var task, queue;
  beforeEach(function() {
    queue = {
      add: jasmine.createSpy()
    };
    Wheel.Utils.RequestQueue.singleton = queue;

    Wheel.Model.subclass('Task', {}, {
      properties: ['name', 'due_at', 'state']
    });
  });

  describe('state', function() {
    beforeEach(function() {
      task = Task.build();
    });

    describe('isNew', function() {
      it('is false if the object has an id', function() {
        expect(task.isNew()).toBe(true);
      });

      it('is true if the object has an id', function() {
        task = Task.build({id: 1});
        expect(task.isNew()).toBe(false);
      });
    });
  });

  describe('properties', function() {
    describe('after subclassing', function() {
      it('already has built the accessors', function() {
        expect(typeof Task.prototype.name).toBe('function');
        expect(typeof Task.prototype.state).toBe('function');
        expect(typeof Task.prototype.due_at).toBe('function');
      });

      describe('.allProperties', function() {
        beforeEach(function() {
          Task.subclass('SpecialTask', {}, {
            properties: ['specialness_rating']
          });
        });

        it('knows its own properties', function() {
          expect(Wheel.Model.allProperties()).toEqual([]);
          expect(Task.allProperties()).toEqual(['name', 'due_at', 'state']);
        });

        it('it includes superclass properties', function() {
          expect(SpecialTask.allProperties()).toEqual(['name', 'due_at', 'state', 'specialness_rating']);
        });
      });
    });

    describe('on the instance', function() {
      it('has accesors', function() {
        task = Task.build();
        expect(typeof task.name).toBe('function');
        expect(typeof task.state).toBe('function');
        expect(typeof task.due_at).toBe('function');
      });

      describe('with initialization arguments', function() {
        beforeEach(function() {
          task = Task.build({
            name: 'Do some meta',
            state: 0,
            due_at: null,
            normalOpt: "I'm normal"
          });
        });

        it('initialization will set the correct attributes', function() {
          expect(typeof task.name).toBe('function');
          expect(typeof task.state).toBe('function');
          expect(typeof task.due_at).toBe('function');
        });

        it('processes non-property initialization options normally', function() {
          expect(task.normalOpt).toBe("I'm normal");
        });
      });

      it('has an accessor for getting all properties', function() {
        task = Task.build({
          name: 'Do some meta',
          state: 0,
          due_at: null,
          normalOpt: "I'm normal"
        });

        expect(task.properties()).toEqual({
          name: 'Do some meta',
          state: 0,
          due_at: null
        });
      });
    });
  });

  describe('Model.attrAccessor(propName)', function() {
    var owner;
    beforeEach(function() {
      task = Task.build({
        name: 'Do some meta',
        state: 0,
        due_at: null
      });
      owner = {name: "Kane"};

      Task.attrAccessor('owner');
    });

    it('creates a prototype function with that name', function() {
      expect(typeof Task.prototype.owner == 'function').toBe(true)
    });

    it('created function reads the underscore prefaced property', function() {
      task._owner = owner;
      expect(task.owner()).toBe(owner);
    });

    describe('when given an argument', function() {
      it('it writes to the underscore prefaced property', function() {
        task.owner(owner);
        expect(task._owner).toBe(owner);
      });

      it('returns the value', function() {
        expect(task.owner(owner)).toBe(owner);
      });

      describe('value has changed', function() {
        beforeEach(function() {
          spyOn(task, 'trigger');
          task.owner(owner);
        });

        it('triggers a "change" event', function() {
          expect(task.trigger).toHaveBeenCalled();
        });

        it('triggers an event related to the property changed', function() {
          expect(task.trigger).toHaveBeenCalled();
          expect(task.trigger.mostRecentCall.args[0]).toBe('change:owner');
        });

        it('marks the object as dirty', function() {
          expect(task._dirty).toBe(true);
        });
      });

      describe('value is the same', function() {
        it('does not trigger any events', function() {
          spyOn(task, 'trigger');
          task.owner(task._owner);
          expect(task.trigger).not.toHaveBeenCalled();
        });
      });
    });

    it('can handle multiple declarations in the same class', function() {
      Task.attrAccessor('tags');
      var tags = ['neato', 'jazzy']
      task.tags(tags);
      task.owner(owner);
      expect(task.tags()).toBe(tags);
      expect(task.owner()).toBe(owner);
    });
  });

  describe('CRUD', function() {
    beforeEach(function() {
      task = Task.build();
    });

    it('mixes in Ajax', function() {
      expect(Task.prototype.send).toBe(Wheel.Mixins.Ajax.send);
    });

    it('mashes in Events', function() {
      expect(Task.on).toBe(Wheel.Mixins.Events.on);
    });

    describe('url detection', function() {
      describe('basePath', function() {
        it('guesses a rest pattern from the class name', function() {
          expect(Task.basePath()).toBe('/tasks');
        });

        it('can work with more complicated naming conventions', function() {
          window.Foo = {};
          Wheel.Model.subclass('Foo.Bar');
          expect(Foo.Bar.basePath()).toBe('/bars')
        });

        it('raises an error if there is no id and no baseUrl', function() {
          var Foo = Wheel.Model.subclass();
          var raised = false;
          try {
            Foo.basePath();
          } catch(e) {
            raised = true;
            expect(e).toMatch(/no 'id'/i);
          }
          expect(raised).toBe(true);
        });
      });

      describe('instance urls', function() {
        it('for new records is the class baseUrl', function() {
          expect(task.url()).toBe(Task.basePath());
        });

        it('for records with ids will include the id', function() {
          task.id = 32;
          expect(task.url()).toBe('/tasks/32');
        });
      });
    });

    describe('save', function() {
      var args;
      beforeEach(function() {
        task = Task.build({
          state: 0,
          name: 'do something',
          due_at: new Date()
        });
      });

      describe('saving a new object', function() {
        beforeEach(function() {
          task.save();
          args = queue.add.mostRecentCall.args[0];
        });

        describe('options passed to the request queue', function() {
          it('data should be the properties', function() {
            expect(args.data).toEqual(task.properties());
          });

          it('url should be correct', function() {
            expect(args.url).toEqual(task.url);
          });

          it('sends a post request', function() {
            expect(args.type).toBe('post');
          });

          it('success callback points to the onSave handler', function() {
            expect(args.success).toBe(task.onSave);
          });
        });

        describe('onSave(response)', function() {
          beforeEach(function() {
            spyOn(Task, 'on').andCallThrough();
            spyOn(task, 'sync');
            task.onSave({
              id: 42
            });
          });

          it('adds the id attribute from the response', function() {
            expect(task.id).toBe(42);
          });

          it('starts listening for updates on the class', function() {
            expect(Task.on).toHaveBeenCalled();
            expect(Task.on.mostRecentCall.args[0]).toBe('update:42');
          });

          it('calls sync when the event gets triggered', function() {
            var object = {foo: 'bar'}
            Task.trigger('update:42', object);
            expect(task.sync).toHaveBeenCalledWith(object);
          });
        });
      });

      describe('saving an existing object', function() {
        beforeEach(function() {
          spyOn(Task, 'trigger');
          task.id = 42;
          task.save();
          args = queue.add.mostRecentCall.args[0];
        });

        it('adds the data and url to the request queue', function() {
          expect(args.url).toBe(task.url);
          expect(args.data).toEqual(task.properties());
        });

        it('sends the request via put', function() {
          expect(args.type).toBe('put');
        });

        it('success handler is onUpdate', function() {
          expect(args.success).toBe(task.onUpdate);
        });

        it('triggers an update event on the class', function() {
          expect(Task.trigger).toHaveBeenCalledWith('update:42', task);
        });
      });
    });

    describe('sync()', function() {
      var other;
      beforeEach(function() {
        other = Task.build({name: 'do something grand!', state: null});
        task.sync(other);
      });

      it('replaces existing properties', function() {
        expect(task.name()).toBe('do something grand!');
      });

      it('clears properties', function() {
        expect(task.state()).toBe(null);
      });
    });

    describe('class level create', function() {
      var opts, fakeTask;
      beforeEach(function() {
        opts = {name: 'get the milk'}
        fakeTask = {save: jasmine.createSpy()};
        spyOn(Task, 'build').andReturn(fakeTask);
      });

      it('makes a new object with the right properties', function() {
        Task.create(opts);
        expect(Task.build).toHaveBeenCalledWith(opts);
      });

      it('saves the object', function() {
        Task.create(opts);
        expect(fakeTask.save).toHaveBeenCalled();
      });
    });

    describe('read', function() {
      describe('reload', function() {
        var args;
        beforeEach(function() {
          task.id = 42;
          spyOn(Task, 'trigger');
          task.reload();
          args = queue.add.mostRecentCall.args[0];
        });

        it('does nothing if there is no id', function() {
          task.id = null;
          queue.add.reset();
          task.reload();
          expect(queue.add).not.toHaveBeenCalled();
        });

        it('makes a request to the url', function() {
          expect(queue.add).toHaveBeenCalled();
          expect(args.url).toBe(task.url);
        });

        describe('success', function() {
          var now;
          beforeEach(function() {
            //spyOn(Task, 'trigger');
            spyOn(task, 'trigger');
            now = Date.now();
            args.success.bind(task)({due_at: now});
          });

          it('resets properties', function() {
            expect(task.due_at()).toBe(now);
          });

          it('triggers the reloaded event on self', function() {
            expect(task.trigger).toHaveBeenCalledWith('reloaded');
          });

          it('triggers an update on the class', function() {
            expect(Task.trigger).toHaveBeenCalledWith('update:42', task);
          });
        });
      });

      xdescribe('class level get', function() {
        it('fails', function() {
          fail();
        });
      });

      xdescribe('all', function() {
        it('fails', function() {
          fail();
        });
      });
    });

    describe('delete', function() {
      var args;
      beforeEach(function() {
        spyOn(Task, 'trigger')
        task.id = 42;
        task.delete();
        args = queue.add.mostRecentCall.args[0];
      });

      it('does nothing if the model is new', function() {
        task.id = null;
        queue.add.reset();
        task.delete();
        expect(queue.add).not.toHaveBeenCalled();
      });

      it('sends a request to the server', function() {
        expect(args.url).toBe(task.url);
      });

      it('sends the request as a delete', function() {
        expect(args.type).toBe('delete');
      });

      it('triggers a delete event on the class', function() {
        expect(Task.trigger).toHaveBeenCalledWith('delete:42');
      });
    });
  });
});
