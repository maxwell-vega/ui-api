import express, { Application, Request, Response} from 'express';
import { Server, Socket } from 'socket.io';
import path from 'path';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import TaskModel from './models/TaskModel';

type Task = {
	_id: string;
	label: string;
	isComplete: boolean;
	superTaskId: string | null;
	listId: string;
	index: number | null;
}

type Tasks = {
	supertasks: Task[];
	subtasks: Task[];
}

dotenv.config()

mongoose.connect('mongodb+srv://new-user:xE7c1te7wnoTo4Gt@cluster0.w5gslzk.mongodb.net/db-one?retryWrites=true&w=majority', {}, () => {
	console.log("Database connection established");
});
const app: Application = express();
app.use(cors)

const server: http.Server = http.createServer(app);
const io: Server = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE"]
	}
})

io.on("connection", (socket: Socket) => {
	
	socket.on("join_list", async (listId: string) => {
		console.log(listId);
		socket.join(listId);
		io.to(socket.id).emit("full_load", await TaskModel.find({ listId }).sort({ index: 'asc' }));
	})

	socket.on("create_task", async (task: Task) => {
		console.log(task);
		task.superTaskId = task.superTaskId || null
		io.in(task.listId).emit("task_created", await new TaskModel(task).save());
	})

	socket.on("update_tasks", async (tasks: Tasks) => {
		for (const task of tasks.supertasks) {
			await TaskModel.findOneAndUpdate({ _id: task._id }, task)
		}
		io.in(tasks.supertasks[0].listId).emit("full_load", [...tasks.supertasks, ...tasks.subtasks]);
	})
})

const port = process.env.PORT || 5001
server.listen(port, () => console.log(`Server listening on port ${port}`))