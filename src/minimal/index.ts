import { fidan, FidanValue, FidanArray } from '@fidanjs/runtime'

// interface & types
type FilterType = '' | 'active' | 'completed'
interface Todo {
  id: number
  title: FidanValue<string>
  editing: FidanValue<boolean>
  completed: FidanValue<boolean>
}

// variables
const STORAGE_KEY = 'fidan_todomvc'
const hashFilter = fidan.value<FilterType>('')
const todos = fidan.array<Todo>([])

const shownTodos: FidanArray<Todo> = fidan.compute(
  () => {
    let _todos = todos()
    const filter = hashFilter()
    if (filter !== '') {
      _todos = _todos.filter((todo) =>
        filter === 'active' ? !todo.completed() : todo.completed()
      ) as any
    }
    return _todos
  },
  () => [todos, hashFilter]
)

// methods
const updateTodo = (todo, title) => {
  todo.title(title)
  todo.editing(false)
}
const clearCompleted = (e) => {
  const removes = []
  todos().forEach((todo) => {
    if (todo.completed()) removes.push(todo)
  })
  while (removes.length) todos().splice(todos().indexOf(removes.pop()), 1)
}

// css computations
const footerLinkCss = (waiting: FilterType) =>
  fidan.compute(
    () => (hashFilter() === waiting ? 'selected' : ''),
    () => [hashFilter]
  )

const editItemCss = (todo: Todo) =>
  fidan.compute(
    () => {
      const classes = []
      todo.completed() && classes.push('completed')
      todo.editing() && classes.push('editing')
      return classes.join(' ')
    },
    () => [todo.completed, todo.editing]
  )

// footer
const todoCount = fidan.compute(
  () => todos().filter((item) => !item.completed()).length,
  () => [todos.size]
)

// router
window.addEventListener('hashchange', () => {
  hashFilter(window.location.hash.substr(2) as FilterType)
})
hashFilter(window.location.hash.substr(2) as FilterType)

// storage
let appInitied = false
const saveTodo = fidan.compute(
  () => {
    if (appInitied) {
      const strTodos = JSON.stringify(todos())
      localStorage.setItem(STORAGE_KEY, strTodos)
    }
  },
  () => [todoCount]
)
const _savedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
_savedTodos.forEach((item) => {
  item.title = fidan.value(item.title)
  item.editing = fidan.value(false).depends(() => [saveTodo])
  item.completed = fidan.value(item.completed).depends(() => [todoCount])
})
todos(_savedTodos)
appInitied = true

// view
const APP = fidan.html`
<header class="header">
<h1>todos</h1>
<input
  class="new-todo"
  placeholder="What needs to be done?"
  autofocus
  onkeypress="${(e) => {
    if (e.key === 'Enter') {
      todos().push({
        id: Math.random(),
        title: fidan.value(e.target.value.trim()).depends(() => [saveTodo]),
        editing: fidan.value(false),
        completed: fidan.value(false).depends(() => [todoCount]),
      })
      e.target.value = ''
    }
  }}"
/>
</header>
<section class="main">
<input 
  id="toggle-all" 
  class="toggle-all" 
  type="checkbox"
  onclick="${(e) =>
    todos().forEach((todo) => todo.completed(e.target.checked))}"
/>
<label for="toggle-all">Mark all as complete</label>
<ul class="todo-list">
    ${fidan.htmlArrayMap(
      shownTodos,
      (todo) => fidan.html`
        <li
          class="${editItemCss(todo)}" 
          ondblclick="${(e: any) => {
            todo.editing(true)
            e.currentTarget.lastElementChild.focus()
          }}">
            <div class="view">
            <input class="toggle" type="checkbox" onchange="${(e) => {
              todo.completed(e.target.checked)
            }}" checked="${todo.completed}" />
            <label>${todo.title}</label>
            <button 
              class="destroy"
              onclick="${(e) => {
                todos().splice(
                  shownTodos().findIndex((item) => item.id == todo.id),
                  1
                )
              }}">
            </button>
            </div>
            <input 
              class="edit"
              value="${todo.title}" 
              onkeypress="${(e) => {
                if (e.key === 'Enter') {
                  updateTodo(todo, e.target.value)
                }
              }}"
              onblur="${(e) => updateTodo(todo, e.target.value)}" />
        </li>
    `
    )}
</ul>
</section>
<footer class="footer">
<span class="todo-count"><strong>${todoCount}</strong> item${fidan.compute(
  () => {
    return todoCount() > 1 ? 's' : ''
  },
  () => [todoCount]
)} left</span>
<ul class="filters">
  <li>
    <a class="${footerLinkCss('')}" href="#/">All</a>
  </li>
  <li>
    <a class="${footerLinkCss('active')}" href="#/active">Active</a>
  </li>
  <li>
    <a class="${footerLinkCss('completed')}" href="#/completed">Completed</a>
  </li>
</ul>
${(element: Element) => {
  const clearButton = fidan.html`<button 
  class="clear-completed"
  onclick="${clearCompleted}">Clear completed</button>`.firstElementChild
  fidan.compute(
    () => {
      if (!element.nextElementSibling && todos().length - todoCount() > 0) {
        element.parentElement.insertBefore(
          clearButton,
          element.nextElementSibling
        )
      } else {
        clearButton.remove()
      }
    },
    () => [todoCount]
  )
}}
</footer>
`

document.querySelector('.todoapp').appendChild(APP)
