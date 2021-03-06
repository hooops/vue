var Vue = require('../../../../src/vue')
var _ = require('../../../../src/util')
var compiler = require('../../../../src/compiler')

if (_.inBrowser) {
  describe('Lifecycle API', function () {

    describe('$mount', function () {

      var el, frag
      beforeEach(function () {
        el = document.createElement('div')
        el.textContent = '{{test}}'
        frag = document.createDocumentFragment()
        frag.appendChild(el)
        spyOn(_, 'warn')
      })

      it('normal', function () {
        var vm = new Vue({
          data: {
            test: 'hi!'
          }
        })
        vm.$mount(el)
        expect(vm.$el).toBe(el)
        expect(el.__vue__).toBe(vm)
        expect(el.textContent).toBe('hi!')
      })

      it('auto-create', function () {
        var vm = new Vue({
          template: '{{a}}',
          data: {
            a: 123
          }
        })
        vm.$mount()
        expect(vm.$el).toBeTruthy()
        expect(vm.$el.tagName).toBe('DIV')
        expect(vm.$el.textContent).toBe('123')
      })

      it('selector', function () {
        el.id = 'mount-test'
        document.body.appendChild(el)
        var vm = new Vue({
          data: { test: 'hi!' }
        })
        vm.$mount('#mount-test')
        expect(vm.$el).toBe(el)
        expect(el.__vue__).toBe(vm)
        expect(el.textContent).toBe('hi!')
        document.body.removeChild(el)
      })

      it('warn invalid selector', function () {
        var vm = new Vue()
        vm.$mount('#none-exist')
        expect(hasWarned(_, 'Cannot find element')).toBe(true)
      })

      it('replace', function () {
        el.className = 'replace-test'
        document.body.appendChild(el)
        var vm = new Vue({
          replace: true,
          data: { test: 'hi!' },
          template: '<div>{{test}}</div>'
        })
        vm.$mount(el)
        expect(vm.$el).not.toBe(el)
        expect(vm.$el.textContent).toBe('hi!')
        expect(document.body.contains(el)).toBe(false)
        expect(document.body.lastChild).toBe(vm.$el)
        expect(vm.$el.className).toBe('replace-test')
        document.body.removeChild(vm.$el)
      })

      it('precompiled linker', function () {
        var linker = compiler.compile(el, Vue.options)
        var vm = new Vue({
          _linker: linker,
          data: {
            test: 'hi!'
          }
        })
        vm.$mount(el)
        expect(vm.$el).toBe(el)
        expect(el.__vue__).toBe(vm)
        expect(el.textContent).toBe('hi!')
      })

      it('mount to fragment', function () {
        var vm = new Vue({
          data: { test: 'frag' }
        })
        vm.$mount(frag)
        expect(vm._blockFragment).toBe(frag)
        expect(vm.$el.nextSibling.textContent).toBe('frag')
      })

      it('replace fragment', function () {
        document.body.appendChild(el)
        var vm = new Vue({
          replace: true,
          data: { test: 'hi!' },
          template: '<div>{{test}}</div><div>{{test + "!"}}</div>'
        })
        vm.$mount(el)
        expect(vm.$el).not.toBe(el)
        expect(vm.$el.nextSibling.textContent).toBe('hi!')
        expect(vm.$el.nextSibling.nextSibling.textContent).toBe('hi!!')
        expect(document.body.contains(el)).toBe(false)
        expect(document.body.lastChild).toBe(vm._fragmentEnd)
        vm.$remove()
      })

      it('hooks', function () {
        var hooks = ['created', 'beforeCompile', 'compiled', 'attached', 'ready']
        var options = {
          data: {
            test: 'hihi'
          }
        }
        hooks.forEach(function (hook) {
          options[hook] = jasmine.createSpy(hook)
        })
        var vm = new Vue(options)
        expect(options.created).toHaveBeenCalled()
        expect(options.beforeCompile).not.toHaveBeenCalled()
        vm.$mount(el)
        expect(options.beforeCompile).toHaveBeenCalled()
        expect(options.compiled).toHaveBeenCalled()
        expect(options.attached).not.toHaveBeenCalled()
        expect(options.ready).not.toHaveBeenCalled()
        vm.$appendTo(document.body)
        expect(options.attached).toHaveBeenCalled()
        expect(options.ready).toHaveBeenCalled()
        vm.$remove()
      })

      it('warn against multiple calls', function () {
        var vm = new Vue({
          el: el
        })
        vm.$mount(el)
        expect(hasWarned(_, '$mount() should be called only once')).toBe(true)
      })

    })

    describe('$destroy', function () {

      it('normal', function () {
        var vm = new Vue()
        expect(vm._isDestroyed).toBe(false)
        var data = vm._data
        expect(data.__ob__.vms.length).toBe(1)
        vm.$destroy()
        expect(data.__ob__.vms.length).toBe(0)
        expect(vm._isDestroyed).toBe(true)
        expect(vm._watchers).toBeNull()
        expect(vm.$el).toBeNull()
        expect(vm.$parent).toBeNull()
        expect(vm.$root).toBeNull()
        expect(vm.$children).toBeNull()
        expect(vm._directives).toBeNull()
        expect(Object.keys(vm._events).length).toBe(0)
      })

      it('remove element', function () {
        var el = document.createElement('div')
        var parent = document.createElement('div')
        parent.appendChild(el)
        var vm = new Vue({ el: el })
        vm.$destroy(true)
        expect(parent.childNodes.length).toBe(0)
        expect(el.__vue__).toBeNull()
      })

      it('hooks', function () {
        var opts = {
          beforeDestroy: jasmine.createSpy(),
          destroyed: jasmine.createSpy(),
          detached: jasmine.createSpy()
        }
        var el = opts.el = document.createElement('div')
        document.body.appendChild(el)
        var vm = new Vue(opts)
        vm.$destroy(true)
        expect(opts.beforeDestroy).toHaveBeenCalled()
        expect(opts.destroyed).toHaveBeenCalled()
        expect(opts.detached).toHaveBeenCalled()
      })

      it('parent', function () {
        var parent = new Vue()
        var child = parent.$addChild()
        var child2 = parent.$addChild()
        expect(parent.$children.length).toBe(2)
        child.$destroy()
        expect(parent.$children.length).toBe(1)
        child2.$destroy()
        expect(parent.$children.length).toBe(0)
      })

      it('children', function () {
        var parent = new Vue()
        var child = parent.$addChild()
        parent.$destroy()
        expect(child._isDestroyed).toBe(true)
      })

      it('directives', function () {
        var spy = jasmine.createSpy('directive unbind')
        var vm = new Vue({
          el: document.createElement('div'),
          template: '<div v-test></div>',
          directives: {
            test: {
              unbind: spy
            }
          }
        })
        vm.$destroy()
        expect(spy).toHaveBeenCalled()
      })

      it('watchers', function () {
        var vm = new Vue({
          el: document.createElement('div'),
          template: '{{a}}',
          data: { a: 1 }
        })
        vm.$watch('a', function () {})
        var dirWatcher = vm._watchers[0]
        var userWatcher = vm._watchers[1]
        vm.$destroy()
        expect(dirWatcher.active).toBe(false)
        expect(userWatcher.active).toBe(false)
      })

      it('refuse multiple calls', function () {
        var spy = jasmine.createSpy()
        var vm = new Vue({
          beforeDestroy: spy
        })
        vm.$destroy()
        vm.$destroy()
        expect(spy.calls.count()).toBe(1)
      })

      it('safely teardown partial compilation', function () {
        var vm = new Vue({
          template: '<div v-component="dialog"><div v-partial="hello"></div></div>',
          partials: {
            hello: 'Hello {{name}}'
          },
          components: {
            dialog: {
              template: '<content>'
            }
          }
        }).$mount()
        expect(function () {
          vm.$destroy()
        }).not.toThrow()
      })

    })

    describe('$compile', function () {

      it('should partial compile and teardown stuff', function (done) {
        var el = document.createElement('div')
        var vm = new Vue({
          el: el,
          template: '{{a}}',
          data: {
            a: 'hi'
          }
        })
        expect(vm._directives.length).toBe(1)
        var partial = document.createElement('span')
        partial.textContent = '{{a}}'
        var decompile = vm.$compile(partial)
        expect(partial.textContent).toBe('hi')
        expect(vm._directives.length).toBe(2)
        decompile()
        expect(vm._directives.length).toBe(1)
        vm.a = 'ha'
        _.nextTick(function () {
          expect(el.textContent).toBe('ha')
          expect(partial.textContent).toBe('hi')
          done()
        })
      })

    })

  })
}
