import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
	label: {
		type: String,
		required: true
	},
	isComplete: {
		type: Boolean,
		required: true
	},
	superTaskId: {
		type: mongoose.SchemaTypes.ObjectId,
		required: false
	},
	listId: {
		type: String,
		required: true
	},
	index: {
		type: Number,
		required: false
	}
});

export default mongoose.model("Task", taskSchema);