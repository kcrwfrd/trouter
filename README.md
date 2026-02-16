# Trouter

A client-side hash fragment URL router with a tree of async resolvers and controllers, built for single-page applications.

## Key Features

- **Framework-agnostic** — bind plain functions or classes as route handlers
- **Hierarchical route tree with async data resolution** — parent resolvers run before child controllers
- **Smart transitions** — only re-enters routes whose params actually changed
- **Zero dependencies**
- **Hash-based (`#!`) and History API routing** (auto-detected)
- **Path params** (`:id`), **query params** (`?filter`), and nested URL composition
- **Controller exit hooks** — async, can block navigation
- **Transition lifecycle hooks** — `onStart`, `onSuccess`, `onError`

## Install

```
npm install @kcrwfrd/trouter
```

## Quick Start

```js
import Router from '@kcrwfrd/trouter'

const router = new Router()

router
  .route('home', {
    url: '/',
    controller: (params) => {
      document.body.textContent = 'Home'
    }
  })
  .route('users', {
    url: '/users',
    resolve: () => fetch('/api/users').then(r => r.json()),
    controller: (params, users) => {
      document.body.textContent = `${users.length} users`
    }
  })

router.listen()
```

Navigate by updating the hash (`#!/users`) or programmatically:

```js
router.go('users')
```

## Core Concepts

### Route Tree & Async Resolution

Routes form a tree. Each route can define a `resolve` function that fetches data **before** its controller runs. Parent resolvers execute before child controllers, so data flows down the tree.

```js
router
  .route('users', {
    url: '/users/:userId',
    resolve: (params) => fetch(`/api/users/${params.userId}`).then(r => r.json()),
    controller: (params, user) => {
      // `user` is the resolved data from this route's resolve
    }
  })
  .route('users.posts', {
    url: '/posts',
    controller: (params) => {
      // By the time this runs, the parent `users` route has already
      // resolved and its controller has executed.
    }
  })
  .route('users.posts.create', {
    url: '/create',
    controller: (params) => {
      // Parent chain: users → users.posts → users.posts.create
      // Each resolve/controller pair runs in sequence down the tree.
    }
  })
```

Navigating to `#!/users/123/posts/create` will:

1. **Resolve** `users` (fetch user 123)
2. **Enter** `users` controller
3. **Enter** `users.posts` controller
4. **Enter** `users.posts.create` controller

### Defining Routes

Register routes with `router.route(name, definition)`. Routes return the router for chaining.

```js
router
  .route('admin', {
    url: '/admin',
    abstract: true // cannot be navigated to directly; serves as a parent
  })
  .route('admin.users', {
    url: '/users',   // full URL becomes /admin/users
    controller: AdminUsersController
  })
  .route('admin.settings', {
    url: '/settings', // full URL becomes /admin/settings
    controller: AdminSettingsController
  })
```

**Hierarchy** is established in three ways:

1. **Dot notation** — `'admin.users'` automatically parents under `'admin'`
2. **`parent` property** — `{ parent: 'admin', ... }`
3. **Route instance** — `{ parent: adminRoute, ... }`

Child URLs are appended to parent URLs. A parent with `/users/:userId` and a child with `/posts/:postId` produces `/users/:userId/posts/:postId`.

### Controllers

Controllers are plain functions or classes. They receive `(params, resolvedData)` when the route is entered.

```js
// Function controller
router.route('home', {
  url: '/',
  controller: (params, data) => {
    document.querySelector('#app').innerHTML = renderHome(data)
  }
})

// Class controller with onExit hook
class UserController {
  constructor(params, user) {
    this.render(user)
  }

  onExit() {
    // Called when leaving this route.
    // Return a promise to delay the transition (e.g. confirm unsaved changes).
    return cleanup()
  }
}

router.route('user', {
  url: '/users/:userId',
  resolve: (params) => fetchUser(params.userId),
  controller: UserController
})
```

A controller class can also define a static `resolve`:

```js
class UserController {
  static resolve(params) {
    return fetchUser(params.userId)
  }

  constructor(params, user) {
    this.render(user)
  }
}

router.route('user', {
  url: '/users/:userId',
  controller: UserController
  // no separate `resolve` needed — uses UserController.resolve
})
```

### Resolvers

The `resolve` property supports several formats:

```js
// Function — receives params, returns a value or promise
resolve: (params) => fetch(`/api/items/${params.id}`)

// Object — named resolves run in parallel, controller receives the keyed results
resolve: {
  users: () => fetch('/api/users').then(r => r.json()),
  posts: () => fetch('/api/posts').then(r => r.json())
}
// controller receives { users: [...], posts: [...] }

// Array — parallel resolution, controller receives array
resolve: [
  () => fetch('/api/users').then(r => r.json()),
  () => fetch('/api/posts').then(r => r.json())
]
// controller receives [usersData, postsData]

// Promise
resolve: Promise.resolve({ cached: true })
```

If a resolver rejects, the transition is cancelled and the router state is restored.

### URL Patterns

**Path params** are prefixed with `:` and are required:

```
/users/:userId          →  #!/users/42
/users/:userId/posts/:postId  →  #!/users/42/posts/7
```

**Query params** are listed after `?` and are optional:

```
/search?query&page      →  #!/search?query=hello&page=2
                        →  #!/search?query=hello  (page omitted)
                        →  #!/search              (both omitted)
```

Query params that are `null` or `undefined` are omitted from the URL. Falsy values like `0`, `false`, and `''` are included.

## API Reference

### `new Router({ prefix })`

Create a router instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | `String` | `'#!'` | URL prefix. Use `'#!'` for hash routing or `''` for History API routing. |

### `router.route(name, definition)` &rarr; `Router`

Register a route. Returns the router for chaining.

### `router.listen()`

Start listening for URL changes. Immediately processes the current URL. Uses `popstate` if the History API is available, otherwise `hashchange`.

### `router.go(name, params)` &rarr; `Promise`

Navigate to a named route. Updates the browser URL and returns a promise that resolves with the new `router.current` state. Throws if the route name is not found.

### `router.href(name, params)` &rarr; `String`

Generate a URL string for a route. Inherits current params by default, merged with any provided params.

```js
router.href('users.posts', { userId: 42, postId: 7 })
// → '#!/users/42/posts/7'
```

### `router.reload(params, hardRefresh)` &rarr; `Promise`

Reload the current route. If `hardRefresh` is true, performs a full browser reload. Otherwise re-runs the transition.

### `router.transitionTo(route, params, options)` &rarr; `Promise`

Low-level transition method. `options.location` controls whether the browser URL is updated.

### `router.pushState(state, title, url)`

Wrapper around `window.history.pushState` with hash fallback.

### Transition Hooks

```js
router.transitions.onStart((route) => {
  // Called before each transition. Return a promise to delay it.
  showSpinner()
})

router.transitions.onSuccess((current) => {
  // Called after a successful transition.
  // current = { route, params }
  document.title = current.route.title
  hideSpinner()
})

router.transitions.onError((error) => {
  // Called when a transition fails (resolve rejected, onExit rejected, etc.)
  hideSpinner()
  showError(error)
})
```

### Router State

| Property | Description |
|----------|-------------|
| `router.current` | Current state: `{ route, params }`. Also exposes `.url()` and `.path()`. |
| `router.previous` | Previous state: `{ route, params }` |

## Route Definition Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `String` | Route identifier. Dot notation (`'parent.child'`) establishes hierarchy. |
| `url` | `String` | URL pattern. Path params with `:param`, query params after `?`. |
| `controller` | `Function\|Class` | Called with `(params, resolvedData)` when route is entered. |
| `resolve` | `Function\|Object\|Array\|Promise` | Data to resolve before the controller runs. |
| `parent` | `String\|Route` | Parent route name or instance. Inferred from dot notation if omitted. |
| `abstract` | `Boolean` | If `true`, route cannot be navigated to directly (useful for layout routes). |
| `title` | `String` | Page title. Defaults to the route name. |

## Smart Transitions

When navigating between routes, Trouter calculates the minimal set of routes to exit and enter based on the nearest common ancestor.

**Parent controllers are NOT re-invoked** when navigating between siblings with unchanged parent params:

```
Navigate: users.detail → users.edit  (userId stays 42)
Exit:     users.detail
Enter:    users.edit
          (users controller is NOT re-entered)
```

**Parent controllers ARE re-invoked** when their params change:

```
Navigate: users.detail(userId=42) → users.detail(userId=99)
Exit:     users.detail, users
Enter:    users, users.detail
          (users controller IS re-entered because userId changed)
```

## License

MIT

