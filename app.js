const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

const priorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const priorityProperties = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const statusProperties = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const categoryProperties = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const categoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const categoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
app.get("/todos/", async (request, response) => {
  const { search_q = "", priority, status, category } = request.query;
  let getTodosQuery = "";
  let todoArray = null;

  switch (true) {
    case priorityAndStatusProperties(request.query):
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case priorityProperties(request.query):
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case statusProperties(request.query):
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case categoryProperties(request.query):
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
         category = '${category}';`;
      break;
    case categoryAndStatusProperties(request.query):
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
         category = '${category}'
          AND status = '${status}';`;
      break;
    case categoryAndPriorityProperties(request.query):
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
         category = '${category}'
          AND priority = '${priority}';`;
      break;
    default:
      getTodosQuery = `
    SELECT 
        *
    FROM 
        todo
    WHERE
        todo LIKE '%${search_q}%';`;
  }
  todoArray = await db.all(getTodosQuery);
  response.send(
    todoArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
  );
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
        SELECT
          *
        FROM
          todo
        WHERE
          id = ${todoId};`;
  const todo = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todo));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  dateFormat = new Date(date);
  const getDateQuery = `
    SELECT
        *
    FROM
        todo
    WHERE 
        CAST(strftime("%Y", due_date) AS INTEGER) = ${dateFormat};`;
  const newDate = await db.get(getDateQuery);
  response.send(convertDbObjectToResponseObject(newDate));
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const getTodoQuery = `
    INSERT INTO 
    todo (id, todo, priority, status, category, due_date)
    VALUES
    (${id},'${todo}','${priority}','${status}','${category}',${dueDate});`;

  await db.run(getTodoQuery);

  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category = '${category}',
      due_date = ${dueDate}
    WHERE
      id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM 
          todo
        WHERE
          id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
