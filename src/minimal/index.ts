import { fidan, FidanValue, FidanArray } from '@fidanjs/runtime'
import { debounce } from '../utils'

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
const allChecked = fidan.value(false)

const shownTodos: FidanArray<Todo> = fidan.compute(() => {
  let _todos = todos()
  const filter = hashFilter()
  if (filter !== '') {
    _todos = _todos.filter((todo) =>
      filter === 'active' ? !todo.completed() : todo.completed()
    ) as any
  }
  return _todos
})

// methods
const updateTodo = (todo: Todo, title: string) => {
  title = title.trim()
  if (title) {
    todo.title(title)
    todo.editing(false)
  } else {
    removeTodo(todo.id)
  }
}
const removeTodo = (id) => {
  todos().splice(shownTodos().findIndex((item) => item.id == id), 1)
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
  fidan.compute(() => (hashFilter() === waiting ? 'selected' : ''))

const editItemCss = (todo: Todo) =>
  fidan.compute(() => {
    const classes = []
    todo.completed() && classes.push('completed')
    todo.editing() && classes.push('editing')
    return classes.join(' ')
  })

// footer
const todoCount = fidan.compute(
  () => {
    const count = todos().filter((item) => !item.completed()).length
    if (count === 0 && !allChecked()) {
      allChecked(true)
    }
    if (count && allChecked()) {
      allChecked(false)
    }
    return count
  },
  () => [todos.size]
)

// router
window.addEventListener('hashchange', () => {
  hashFilter(window.location.hash.substr(2) as FilterType)
})
hashFilter(window.location.hash.substr(2) as FilterType)

// storage
const saveTodo = fidan.compute(
  debounce(() => {
    const strTodos = JSON.stringify(todos())
    localStorage.setItem(STORAGE_KEY, strTodos)
  }, 0),
  () => [todoCount]
)
const _savedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
_savedTodos.forEach((item) => {
  item.title = fidan.value(item.title)
  item.editing = fidan.value(false).depends(() => [saveTodo])
  item.completed = fidan.value(item.completed).depends(() => [todoCount])
})
todos(_savedTodos)
allChecked(todoCount() === 0)

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
      const title = e.target.value.trim()
      title &&
        todos().push({
          id: Math.random(),
          title: fidan.value(title).depends(() => [saveTodo]),
          editing: fidan.value(false),
          completed: fidan.value(false).depends(() => [todoCount]),
        })
      e.target.value = ''
    }
  }}"
/>
</header>
${fidan.coditionalDom(
  () => todos.size() > 0,
  () => [todos.size],
  fidan.html`
  <section class="main">
    <input 
      id="toggle-all" 
      class="toggle-all" 
      type="checkbox"
      checked="${allChecked}"
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
                  onclick="${(e) => removeTodo(todo.id)}"></button>
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
    () => (todoCount() > 1 ? 's' : '')
  )} left</span>
    <ul class="filters">
      <li>
        <a class="${footerLinkCss('')}" href="#/">All</a>
      </li>
      <li>
        <a class="${footerLinkCss('active')}" href="#/active">Active</a>
      </li>
      <li>
        <a class="${footerLinkCss(
          'completed'
        )}" href="#/completed">Completed</a>
      </li>
    </ul>
    ${fidan.coditionalDom(
      () => todos().length - todoCount() > 0,
      () => [todoCount],
      fidan.html`<button 
        class="clear-completed"
        onclick="${clearCompleted}">Clear completed</button>`
    )}
  </footer>
  `
)}
`

document.querySelector('.todoapp').appendChild(APP)
