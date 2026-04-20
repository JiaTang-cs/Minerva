const taskOutputs = new Map<string, string>();

export function appendSubagentTaskOutput(taskId: string, delta: string): void {
  taskOutputs.set(taskId, (taskOutputs.get(taskId) ?? "") + delta);
}

export function setSubagentTaskOutput(taskId: string, output: string): void {
  taskOutputs.set(taskId, output);
}

export function getSubagentTaskOutput(taskId: string): string {
  return taskOutputs.get(taskId) ?? "";
}

export function clearSubagentTaskOutput(taskId: string): void {
  taskOutputs.delete(taskId);
}
