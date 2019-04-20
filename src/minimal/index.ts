import { fidan, FidanValue, FidanArray } from '@fidanjs/runtime'

type FilterType = '' | 'active' | 'completed'
interface Todo {
  id: number
  title: FidanValue<string>
  editing: FidanValue<boolean>
  completed: FidanValue<boolean>
}

const hashFilter = fidan.value<FilterType>('')
const todos = fidan.array<Todo>([])

const shownTodos: FidanArray<Todo> = fidan.compute(
  () => {
    let _todos = todos() as any
    const filter = hashFilter()
    if (filter !== '') {
      _todos = _todos.filter((todo) =>
        filter === 'active' ? !todo.completed() : todo.completed()
      )
    }
    return _todos
  },
  todos,
  hashFilter
) as any

const removeTodo = (id) => {
  const idx = shownTodos().findIndex((item) => item.id == id)
  todos().splice(idx, 1)
  todos(todos()) // ideal kullanım için bu satıra gerek kalmadan çalışılabilmeli
}

// css computations
const footerLinkCss = (waiting: FilterType) =>
  fidan.compute(() => (hashFilter() === waiting ? 'selected' : ''), hashFilter)

const editItemCss = (todo: Todo) =>
  fidan.compute(
    () => {
      const classes = []
      todo.completed() && classes.push('completed')
      todo.editing() && classes.push('editing')
      return classes.join(' ')
    },
    todo.completed,
    todo.editing
  )

// router
window.addEventListener('hashchange', () => {
  hashFilter(window.location.hash.substr(2) as any)
})
hashFilter(window.location.hash.substr(2) as any)

// view
const app = fidan.html`
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
        title: fidan.value(e.target.value.trim()),
        editing: fidan.value(false),
        completed: fidan.value(false),
      })
      e.target.value = ''
    }
  }}"
/>
</header>
<section class="main">
<input id="toggle-all" class="toggle-all" type="checkbox" />
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
            <input class="toggle" type="checkbox" onchange="${(e) =>
              todo.completed(e.target.checked)}" checked="${todo.completed}" />
            <label>${todo.title}</label>
            <button 
              class="destroy"
              onclick="${(e) => removeTodo(todo.id)}"></button>
            </div>
            <input 
              class="edit"
              value="${todo.title}" 
              onblur="${(e) => {
                todo.title(e.target.value)
                todo.editing(false)
              }}" />
        </li>
    `
    )}
</ul>
</section>
<footer class="footer">
<span class="todo-count"><strong>${fidan.compute(() => {
  return todos().filter((item) => !item.completed()).length
}, todos)}</strong> item left</span>
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
<button class="clear-completed">Clear completed</button>
</footer>
`

document.querySelector('.todoapp').appendChild(app)
