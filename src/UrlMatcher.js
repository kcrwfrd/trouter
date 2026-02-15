class UrlMatcher {
  /**
   * @constructor
   * @description
   * Takes a URL pattern with optional params denoted by ':'
   *
   * @param {String} urlPattern - e.g. /foo/:fooId/bar?bazId
   */

  constructor(urlPattern) {
    this.params = []
    this.pathParams = []
    this.queryParams = []

    // Query args are optional and can occur in any order, so we
    // match for them separately from the path RegEx pattern.
    this.queryPatterns = []

    // We'll build up the regex string
    // as we iterate through the path.
    let pattern = ''

    let [pathPattern, queryPattern] = urlPattern.split('?')

    // @TODO: find a more elegant way
    if (pathPattern === '/') {
      pattern += '/'
    }

    for (let item of pathPattern.split('/')) {
      if (item === '') continue

      let isParam = item.startsWith(':')

      if (isParam) {
        let paramName = item.slice(1)

        this.pathParams.push(paramName)

        // Note: special characters in RegEx patterns written
        // as strings need to be double-escaped.
        pattern += '/([\\w-]+)'
      } else {
        pattern += '/' + item
      }
    }

    if (queryPattern) {
      for (let item of queryPattern.split('&')) {
        this.queryParams.push(item)

        let queryPattern = `${item}=([\\w-.~:/?#[\\]@!$'"()*+,:%]+)`

        this.queryPatterns.push(new RegExp(queryPattern))
      }
    }

    this.params = this.pathParams.concat(this.queryParams)

    // Pattern may optionally end with query args
    this.pattern = new RegExp(`^${pattern}(?:\\?.*)?$`)
  }

  /**
   * @method exec
   * @description
   * Tests a path, providing route params if match found.
   * Returns null if not a match.
   *
   * @param {String} path
   *
   * @returns {Object|null}
   *
   * @example
   * new UrlMatcher('/foo/:id').exec('/foo/1') -> { id: '1'}
   */

  exec(path) {
    let match = this.pattern.exec(path)

    if (!match) {
      return null
    }

    let result = {}

    // Captured path params
    match = match.slice(1)

    for (let [index, param] of this.pathParams.entries()) {
      // @TODO: throw error at route definition time for duplicate params
      if (result[param]) {
        console.warn(`Warning: duplicate param '${param}'`)
      }

      result[param] = match[index]
    }

    for (let [index, param] of this.queryParams.entries()) {
      // @TODO: throw error at route definition time for duplicate params
      if (result[param]) {
        console.warn(`Warning: duplicate param '${param}'`)
      }

      let match = this.queryPatterns[index].exec(path)

      result[param] = match && match[1] || null
    }

    return result
  }

  /**
   * @method getParams
   * @static
   * @description
   * Extract param names from a URL pattern.
   *
   * @param {String} urlPattern
   * @param {Function} [callback] - Optional
   *
   * @example
   * UrlMatcher.getParams('/foo/:fooId/bar/:barId')
   * -> ['fooId', 'barId']
   */

  static getParams(urlPattern) {
    let params = []

    for (let item of urlPattern.split('/')) {
      if (item === '') continue

      if(item.startsWith(':')) {
        params.push(item.slice(1))
      }
    }

    return params
  }
}

export default UrlMatcher
