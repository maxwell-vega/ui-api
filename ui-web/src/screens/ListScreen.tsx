import React, { ChangeEvent, MouseEvent, KeyboardEvent, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult, ResponderProvided } from 'react-beautiful-dnd'
import io, { Socket } from 'socket.io-client'

type Props = {};

type Task = {
	_id: string;
	label: string;
	isComplete: boolean;
	superTaskId: string | null;
	listId: string;
	index: number | null;
}

enum Filter {
	all = 'all',
	done = 'done',
	todo = 'todo'
}

const socket: Socket = io("http://localhost:5001");

const ListScreen: React.FC<Props> = () => {
	let params = useParams();
	let navigate = useNavigate();

	const [tasks, setTasks] = useState<Task[]>([])
	const [newTaskLabel, setNewTaskLabel] = useState<string>('')
	const [newTaskSuperTaskId, setNewTaskSuperTaskId] = useState<string>('')
	const [filterValue, setFilterValue] = useState<Filter>(Filter.all)
	const [currentListId, setCurrentListId] = useState<string>(params.listId || '')
	const [visibleAddTaskBtn, setVisibleAddTaskBtn] = useState<string>('')

	useEffect(() => {
		socket.on("task_created", (newTask) => {
			if (!tasks.includes(newTask)) {
				setTasks(tasks => [...tasks, newTask])
			}
		})
		socket.on("full_load", (data) => {
			setTasks(data)
		})
		if (params.listId) {
			socket.emit("join_list", params.listId)
		}

	}, [socket])

	const handleNewTaskLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
		return setNewTaskLabel(e.target.value)
	};

	const handleNewTaskKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && newTaskLabel) {
			socket.emit("create_task", {
				label: newTaskLabel,
				isComplete: false,
				superTaskId: newTaskSuperTaskId,
				listId: currentListId,
				index: newTaskSuperTaskId ? null : tasks.filter(task => !task.superTaskId).length
			})
			setNewTaskLabel('')
		}
	};

	const handleCompleteChange = (handledTask: Task) => (e: ChangeEvent<HTMLInputElement>) => {
		setTasks(tasks => tasks.map(task => {
			if (task._id === handledTask._id) return { ...task, isComplete: e.target.checked }
			return task
		}))
	}

	const handleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value === Filter.all || e.target.value === Filter.done || e.target.value === Filter.todo)
			return setFilterValue(e.target.value)
	}

	const handleCurrentListIdChange = (e: ChangeEvent<HTMLInputElement>) => {
		return setCurrentListId(e.target.value)
	};

	const handleCurrentListIdKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && currentListId) {
			navigate(`/${currentListId}`)
			socket.emit("join_list", currentListId)
		}
	};

	const handleTaskClick = (id: string) => {
		return setNewTaskSuperTaskId(id)
	};

	const handleOnDragEnd = (result: DropResult) => {
		if (!result.destination) return;
		let items: Task[] = Array.from(tasks)
		let supertasks = items.filter(task => !task.superTaskId)
		const subtasks = items.filter(task => task.superTaskId)
		const [reorderedItem]: Task[] = supertasks.splice(result.source.index, 1)
		
		supertasks = supertasks.filter(task => task._id !== reorderedItem._id)
		supertasks.splice(result.destination.index, 0, reorderedItem)
		supertasks.forEach((item, index) => {
			item.index = index
		})
		
		socket.emit("update_tasks", { supertasks, subtasks })
		setTasks([ ...supertasks, ...subtasks ])
	};

	const filterTasks = (task: Task) => {
		if (!task || task.superTaskId) return false
		if (filterValue === Filter.all) return true
		if (filterValue === Filter.done) return task.isComplete === true
		if (filterValue === Filter.todo) return task.isComplete === false
		return null
	}

	const returnSubtasks = (_id: string) => {
		return (
			<ul>
				{ tasks.filter(subtask => subtask.superTaskId === _id).map(subtask =>
					<div key={subtask._id}>
						<li onMouseOver={() => setVisibleAddTaskBtn(subtask._id)} onMouseOut={() => setVisibleAddTaskBtn('')}>
							<input type="checkbox" checked={subtask.isComplete} onChange={handleCompleteChange(subtask)}/>
							{subtask.index} - {subtask.label}
							{visibleAddTaskBtn === subtask._id &&
								<button onClick={() => handleTaskClick(subtask._id)}>+</button>
							}
						</li>
						{returnSubtasks(subtask._id)}
					</div>
				)}
			</ul>
		)
	}

	return (
		<div>
			<label htmlFor="currentListId"> List id: </label>
			<input name="currentListId" value={currentListId} onChange={handleCurrentListIdChange} onKeyPress={handleCurrentListIdKeyPress}></input>
			<br />
			<label htmlFor="filter"> Filter: </label>
			<select value={filterValue} onChange={handleFilterChange} name="filter">
				<option value="all">all</option>
				<option value="done">done</option>
				<option value="todo">todo</option>
			</select>
			<DragDropContext onDragEnd={handleOnDragEnd}>
				<Droppable droppableId="tasks">
					{(provided) => (
						<ul {...provided.droppableProps} ref={provided.innerRef}>
							{ tasks.filter(task => filterTasks(task)).map((task) =>
								<Draggable key={task._id} draggableId={task._id} index={task.index || 0}>
									{(provided) => (
										<div {...provided.draggableProps} ref={provided.innerRef} {...provided.dragHandleProps}>
											<li onMouseOver={() => setVisibleAddTaskBtn(task._id)} onMouseOut={() => setVisibleAddTaskBtn('')} onClick={() => handleTaskClick(task._id)}>
												<input type="checkbox" checked={task.isComplete} onChange={handleCompleteChange(task)}/>
												{task.index} - {task.label}
												{visibleAddTaskBtn === task._id &&
													<button onClick={() => handleTaskClick(task._id)}>+</button>
												}
											</li>
											{returnSubtasks(task._id)}
										</div>
									)}
								</Draggable>
							)}
							{provided.placeholder}
						</ul>
					)}
				</Droppable>
			</DragDropContext>
			{newTaskSuperTaskId && 
				<div>
					<label htmlFor="newTaskLabel"> New subtask for "{tasks.find(task => task._id === newTaskSuperTaskId)?.label}": </label>
					<button onClick={() => setNewTaskSuperTaskId('')}>X</button>
				</div>
			}
			{!newTaskSuperTaskId && 
				<label htmlFor="newTaskLabel"> New task: </label>
			}
			<br />
			<input name="newTaskLabel" value={newTaskLabel} onChange={handleNewTaskLabelChange} onKeyPress={handleNewTaskKeyPress}></input>
		</div>
	)
}

export default ListScreen;
