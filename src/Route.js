import UrlMatcher from './UrlMatcher'

/**
 * @class Route
 * @description
 * A fully-built route.
 */

// RegEx for matching URL params
const PARAMS = /\:([A-Za-z0-9_-]+)/g

class Route {
  constructor(definition) {
    let {
      abstract, controller, name,
      parent, path, resolve, title, url
    } = definition

    url = url || ''

    if (url) {
      // @TODO abstract param parsing out from UrlMatcher.
      // We parse this routes URL before prepending parents so
      // we only have this route's params.
      var urlMatcher = new UrlMatcher(url)
    }

    this.params = urlMatcher && urlMatcher.params || []

    // Prepend URL with parent's URL
    // @TODO: should each route only be concerned with its section of the url?
    // e.g. fullUrl = this.path.reduce(((url, route) => url + route.url), this.router.base)
    url = (parent && parent.url) ? parent.url + url : url;

    // Only 1 resolve definition allowed
    if (controller && controller.resolve && resolve) {
      throw new Error('Resolve cannot be defined on both controller and route.')
    }

    this.Controller = controller // Controller definition
    this.controller = null // Controller instance
    this.name = name
    this.navigable = !!url && !abstract
    this.parent = parent || null
    this.path = path.concat(this)
    this.resolve = resolve || (controller && controller.resolve) || {}
    this.title = title || name
    this.url = url
  }

  getFqn() {
    if (!this.parent) {
      return this.name
    }

    let name = this.parent.getFqn()

    return name ? name + '.' + this.name : this.name
  }

  /**
   * @method getRoot
   * @description
   * Returns the root node of this route's tree
   */

  getRoot() {
    return this.parent && this.parent.getRoot() || this
  }

  /**
   * @method href
   * @description
   * Returns route's URL with specified params.
   *
   * @param {Object} [params] - Required if route has params
   *
   * @example
   * this.url
   * -> /foo/:fooId
   *
   * this.href({fooId: 1})
   * -> /foo/1
   */

  href(params = {}) {
    if (!this.url) {
      return ''
    }

    let [path, query] = this.url.split('?')

    let url = path.replace(PARAMS, (match, param) => {
      if (param in params) {
        return params[param]
      }

      throw new Error(`Missing required param '${param}'`)
    })

    if (query) {
      let isFirst = true

      for (let paramName of query.split('&')) {
        let paramValue = params[paramName]

        if (paramValue) {
          (isFirst) ? url += '?' : url += '&';

          url += `${paramName}=${paramValue}`

          isFirst = false
        }
      }
    }

    return url
  }

  /**
   * @method enter
   * @description
   * Route becomes active, instantiating its controller
   * if one is defined.
   *
   * @returns {Promise}
   */

  enter(params = {}) {
    let promise = getResolve(this.resolve, params)

    return promise.then((resolve) => {
      if (this.Controller) {
        this.controller = new this.Controller(params, resolve)
      }

      return resolve
    })
  }

  /**
   * @method exit
   * @description
   * Route exits, calling controller.onExit and deleting its reference.
   *
   * @returns {Promise}
   */

  exit() {
    let promise = (this.controller && this.controller.onExit) ?
      Promise.resolve(this.controller.onExit()) : Promise.resolve()

    return promise.then((result) => {
      if (this.controller) {
        this.controller = null
      }

      return result
    })
  }
}

/**
 * @method getResolve
 * @private
 * @description
 * Invokes/normalizes resolve functions and values into promises.
 *
 * @param {*} value
 *
 * @returns {Promise}
 */

function getResolve(value, params) {
  if (value instanceof Promise) {
    return value
  }

  if (typeof value === 'function') {
    return Promise.resolve(value(params))
  }

  if (isPlainObject(value)) {
    return resolveObject(value, params)
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => {
      return (typeof item === 'function') ? item(params) : item
    }))
  }

  return Promise.resolve(value)
}

function resolveObject(obj, params) {
  let keys = Object.keys(obj)

  // First invoke resolves and combine into single promise
  let combinedPromise = Promise.all(keys.map((key) => {
    let value = obj[key]

    return (typeof value === 'function') ? value(params) : value
  }))

  // Then assign resolved values to their keys
  return combinedPromise.then((values) => {
    return values.reduce((memo, value, index) => {
      let key = keys[index]

      memo[key] = value

      return memo
    }, {})
  })
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export default Route
