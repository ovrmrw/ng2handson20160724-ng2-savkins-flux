import { bootstrap } from '@angular/platform-browser-dynamic';
import { Component, Input, Output, EventEmitter, enableProdMode, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { Observable, Observer, Subject, BehaviorSubject } from 'rxjs/Rx';


////////////////////////////////////////////////////////////////////////////////////
// -- state
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface AppState {
  todos: Todo[];
  visibilityFilter: string;
}


////////////////////////////////////////////////////////////////////////////////////
// -- actions
class AddTodoAction {
  constructor(public todoId: number, public text: string) { }
}
class ToggleTodoAction {
  constructor(public id: number) { }
}
class SetVisibilityFilter {
  constructor(public filter: string) { }
}

type Action = AddTodoAction | ToggleTodoAction | SetVisibilityFilter;


////////////////////////////////////////////////////////////////////////////////////
// -- statefn
class Store {
  private stateSubject$: Subject<AppState>;

  constructor(initState: AppState, dispatcher$: Observable<Action>) {
    this.stateSubject$ = new BehaviorSubject(initState);

    Observable
      .zip(
      todosStateReducer(initState.todos, dispatcher$),
      filterStateReducer(initState.visibilityFilter, dispatcher$)
      )
      .map<AppState>(states => {
        return { todos: states[0], visibilityFilter: states[1] }
      })
      .subscribe(appState => {
        this.stateSubject$.next(appState);
      });
  }

  get state$() {
    return this.stateSubject$ as Observable<AppState>;
  }
}

function todosStateReducer(initTodos: Todo[], dispatcher$: Observable<Action>): Observable<Todo[]> {
  return dispatcher$.scan<Todo[]>((todos: Todo[], action: Action) => {
    if (action instanceof AddTodoAction) {
      const newTodo = {
        id: action.todoId,
        text: action.text,
        completed: false
      } as Todo;
      return [...todos, newTodo];
    } else if (action instanceof ToggleTodoAction) {
      const _action = action;
      return todos.map(todo => {
        return (_action.id !== todo.id) ? todo : merge(todo, { completed: !todo.completed });
      });
    } else {
      return todos;
    }
  }, initTodos);
}

function filterStateReducer(initFilter: string, dispatcher$: Observable<Action>): Observable<string> {
  return dispatcher$.scan<string>((filter: string, action: Action) => {
    if (action instanceof SetVisibilityFilter) {
      return action.filter;
    } else {
      return filter;
    }
  }, initFilter);
}

function merge<T>(obj1: T, obj2: {}): T {
  let obj3 = {};
  for (let attrname in obj1) {
    obj3[attrname] = obj1[attrname];
  }
  for (let attrname in obj2) {
    obj3[attrname] = obj2[attrname];
  }
  return obj3 as T;
}


////////////////////////////////////////////////////////////////////////////////////
// -- DI config
class Dispatcher<T> extends Subject<T> { }

const stateAndDispatcher = [
  { provide: 'initState', useValue: { todos: [], visibilityFilter: 'SHOW_ALL' } as AppState },
  { provide: Dispatcher, useValue: new Dispatcher<Action>() },
  { provide: Store, useFactory: (state, dispatcher) => new Store(state, dispatcher), deps: ['initState', Dispatcher] }
];


////////////////////////////////////////////////////////////////////////////////////
// -- Components
@Component({
  selector: 'todo',
  template: `
    <span (click)="toggle.next()" [ngClass]="{'deco-linethrough': textEffectFlag}">
      {{todo.text}}
    </span>
  `
})
class TodoComponent {
  @Input() todo: Todo;
  @Output() toggle = new EventEmitter();

  get textEffectFlag() {
    return this.todo.completed;
  }
}

@Component({
  selector: 'todo-list',
  template: `
    <todo *ngFor="let t of filtered | async"
      [todo]="t"
      (toggle)="emitToggle(t.id)"></todo>
  `,
  directives: [TodoComponent]
})
class TodoListComponent {
  constructor(
    private dispatcher$: Dispatcher<Action>,
    private store: Store
  ) { }

  get filtered() {
    return this.store.state$.map<Todo[]>((state: AppState) => {
      return getVisibleTodos(state.todos, state.visibilityFilter);
    });
  }

  emitToggle(id: number) {
    this.dispatcher$.next(new ToggleTodoAction(id));
  }
}

function getVisibleTodos(todos: Todo[], filter: string): Todo[] {
  return todos.filter(todo => {
    if (filter === "SHOW_ACTIVE") {
      return !todo.completed;
    }
    if (filter === "SHOW_COMPLETED") {
      return todo.completed;
    }
    return true;
  });
}

@Component({
  selector: 'add-todo',
  template: `
    <input #text><button (click)="addTodo(text.value)">Add Todo</button>
  `
})
class AddTodoComponent {
  private nextId = 0;

  constructor(
    private dispatcher$: Dispatcher<Action>
  ) { }

  addTodo(value: string) {
    this.dispatcher$.next(new AddTodoAction(this.nextId++, value));
  }
}

@Component({
  selector: 'filter-link',
  template: `
    <a href="#" (click)="setVisibilityFilter()"
      [class]="textEffect | async"><ng-content></ng-content></a>
  `
})
class FilterLinkComponent {
  @Input() filter: string;

  constructor(
    private dispatcher$: Dispatcher<Action>,
    private store: Store
  ) { }

  get textEffect() {
    return this.store.state$.map<string>((state: AppState) => {
      return state.visibilityFilter === this.filter ? 'deco-underline' : 'deco-none'; // style.cssでCSSクラスを定義しています。
    });
  }

  setVisibilityFilter() {
    this.dispatcher$.next(new SetVisibilityFilter(this.filter));
  }
}

@Component({
  selector: 'footer',
  template: `
    <filter-link filter="SHOW_ALL">All</filter-link>
    <filter-link filter="SHOW_ACTIVE">Active</filter-link>
    <filter-link filter="SHOW_COMPLETED">Completed</filter-link>
  `,
  directives: [FilterLinkComponent]
})
class FooterComponent { }

@Component({
  selector: 'my-app',
  template: `
    <add-todo></add-todo>
    <todo-list></todo-list>
    <footer></footer>
  `,
  directives: [AddTodoComponent, TodoListComponent, FooterComponent],
  providers: [stateAndDispatcher],
  changeDetection: ChangeDetectionStrategy.OnPush
})
class TodoApp { }


enableProdMode();
bootstrap(TodoApp)
  .catch(err => console.error(err));
