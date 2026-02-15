import UrlMatcher from './UrlMatcher'

class UrlRouter {
  constructor(prefix) {
    this.prefix = prefix || '#!'
    this.rules = []
    this.default = null

    this.usePushState = !!(window.history && window.history.pushState)
  }

  onChange(hash) {
    let path = hash.replace(this.prefix, '')

    for (let rule of this.rules) {
      if (rule(path)) {
        return true
      }
    }

    console.warn(`No route handler found for '${path}'`)

    if (this.default && path !== this.default) {
      let url = this.prefix + this.default

      this.replaceState({}, '', url)
      this.onChange(url)
    }
  }

  listen() {
    window.addEventListener(
      this.usePushState ? 'popstate' : 'hashchange',
      () => this.onChange(window.location.hash)
    )

    // Handle the current hash
    this.onChange(window.location.hash)
  }

  /**
   * @method pushState
   * @description
   * Wraps window.history.pushState.
   *
   * @param {Object} state
   * @param {String} title
   * @param {String} url
   */

  pushState(state = {}, title, url) {
    if (this.usePushState) {
      window.history.pushState(state, title, url)
    } else {
      window.location.hash = url
    }
  }

  /**
   * @method replaceState
   * @description
   * Wraps window.history.replaceState.
   *
   * @param {Object} state
   * @param {String} title
   * @param {String} url
   */

  replaceState(state = {}, title, url) {
    if (this.usePushState) {
      window.history.replaceState(state, title, url)
    } else {
      let href = window.location.href.replace(/(javascript:|#).*$/, '')
      window.location.replace(href + url)
    }
  }

  when(url, handler) {
    let matcher = new UrlMatcher(url)

    this.rules.push((path) => {
      let result = matcher.exec(path)

      if (!result) {
        return false
      }

      handler(result)

      return true
    })
  }

  otherwise(url) {
    this.default = url
  }
}

export default UrlRouter
