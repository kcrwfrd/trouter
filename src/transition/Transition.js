import Queue from '../Queue'

/**
 * @name Transition
 * @description
 * Manages route transitions
 */

class Transition {

  /**
   * @param {Transitions} transitions
   * @param {Route} current
   * @param {Route} target
   * @param {Object} [currentParams]
   * @param {Object} [toParams]
   */

  constructor(transitions, current, target, currentParams = {}, toParams = {}) {
    // If a parent param has changed, we'll need to reload from there
    let changedParams = Object.entries(currentParams).reduce((memo, [key, value]) => {
      if (key in toParams && toParams[key] !== value) {
        memo[key] = toParams[key]
      }

      return memo
    }, {})

    // @TODO refactor path traversal into PathFactory

    let nearestCommonAncestor =
      current.path.findLast((ancestor) => {
        return target.path.indexOf(ancestor) > -1
      })

    // We'll need to reload starting from here if a param changed
    let minStartIndex = target.path.findIndex((route, index) => {
      return route.params.some((param) => param in changedParams)
    })

    // Determine which node in the entering target's path to start from
    let enterIndex = (() => {
      let fromAncestor = target.path.indexOf(nearestCommonAncestor) + 1

      if (current === target && minStartIndex < 0) {
        return target.path.length - 1
      }

      if (minStartIndex < 0 || fromAncestor < minStartIndex) {
        return fromAncestor
      }

      return minStartIndex
    })()

    this.enterPath = target.path.slice(enterIndex)

    // Determine last node in the exiting route's path to exit
    let exitIndex = (() => {
      let enterStart = target.path[enterIndex]

      let changedAncestorIndex = current.path.indexOf(enterStart)

      if (changedAncestorIndex >= 0) {
        return changedAncestorIndex
      }

      return current.path.indexOf(nearestCommonAncestor) + 1
    })()

    this.exitPath = current.path.slice(exitIndex).reverse()

    this.onStartQueue = new Queue(transitions.onStartHandlers.map((handler) => {
      return handler.bind(handler, target)
    }))

    this.exitQueue = new Queue(this.exitPath.map((route) => {
      return route.exit.bind(route)
    }))

    this.enterQueue = new Queue(this.enterPath.map((route) => {
      return route.enter.bind(route, toParams)
    }))
  }

  run() {
    return this.onStartQueue.flush()
      .then(() => this.exitQueue.flush())
      .then(() => this.enterQueue.flush())
  }
}

export default Transition
