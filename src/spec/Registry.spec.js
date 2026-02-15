import { describe, it, expect, beforeEach } from 'vitest'
import Registry from '../Registry'

describe('Registry:', () => {
  let registry;

  let routes = {
    home: {
      name: 'home',
      url: 'home',
    },
    child: {
      parent: 'home',
      name: 'child',
      url: 'child',
    },
    sibling: {
      name: 'home.sibling',
      url: 'sibling',
    },
    grandChild: {
      parent: 'child',
      name: 'grandChild',
      url: 'grandChild',
    }
  }

  beforeEach(() => {
    let router = () => {}
    let urlRouter = { when: () => {} }

    registry = new Registry(router, urlRouter)
  })

  describe('register(definition):', () => {
    it('Should register a new route.', () => {
      let route = registry.register(routes.home)

      expect(route).toBeDefined()
      expect(registry.get('home')).toBe(route)
    })

    it("Should resolve a route's parent.", () => {
      let home = registry.register(routes.home)
      let child = registry.register(routes.child)

      expect(child).toBeDefined()
      expect(child.parent).toBe(home)
    })

    it('Should build a child specified in dot syntax.', () => {
      let home = registry.register(routes.home)
      let sibling = registry.register(routes.sibling)

      expect(sibling).toBeDefined()
      expect(sibling.parent).toBe(home)
    })

    it("Should not build a route whose parent doesn't exist yet.", () => {
      // @TODO: route registration queue?
      let child = registry.register(routes.child)

      expect(child).toBe(null)
    })

    it("Should resolve a route's root.", () => {
      let home = registry.register(routes.home)
      let child = registry.register(routes.child)
      let grandChild = registry.register(routes.grandChild)

      expect(grandChild.getRoot()).toBe(registry.root)
    })

    it("Should resolve a route's path.", () => {
      let home = registry.register(routes.home)
      let child = registry.register(routes.child)
      let grandChild = registry.register(routes.grandChild)

      expect(grandChild.path[0]).toBe(registry.root)
      expect(grandChild.path[1]).toBe(home)
      expect(grandChild.path[2]).toBe(child)
      expect(grandChild.path[3]).toBe(grandChild)
    })
  })
})
