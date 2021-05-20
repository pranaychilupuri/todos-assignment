const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const addDate = require("date-fns");
const { format } = require("date-fns");

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
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const formatMonth = (input) => {
  if (input > 9) {
    return `${input}`;
  } else {
    return `0${input}`;
  }
};

const formatDate = (date) => {
  if (date > 9) {
    return `${date}`;
  } else {
    return `0${date}`;
  }
};

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

const ifValidBodyRequest = (request, response, next) => {
  const { category, priority, status, dueDate } = request.body;
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  const categoryArray = ["WORK", "HOME", "LEARNING"];
  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  const isDateValid = addDate.isValid(new Date(dueDate));

  if (category && !categoryArray.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (priority && !priorityArray.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (status && !statusArray.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (dueDate && !isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

const ifQueryValid = (request, response, next) => {
  const { category, priority, status, date } = request.query;
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  const categoryArray = ["WORK", "HOME", "LEARNING"];
  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  const isDateValid = addDate.isValid(new Date(date));

  if (category && !categoryArray.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (priority && !priorityArray.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (status && !statusArray.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (date && !isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

//Todos API 1

app.get("/todos/", ifQueryValid, async (request, response) => {
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

//TodoId API

app.get("/todos/:todoId/", ifQueryValid, async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId};`;
  const todoItem = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todoItem));
});

//Date API

app.get("/agenda/", ifQueryValid, async (request, response) => {
  const { date } = request.query;
  const dateString = addDate.format(new Date(date), "yyyy-MM-dd");
  const dateFormate = new Date(dateString);
  const yy = dateFormate.getFullYear();
  const mm = parseInt(formatMonth(dateFormate.getMonth() + 1));

  const dd = parseInt(formatDate(dateFormate.getDate()));

  const getDateQuery = `
    SELECT * FROM todo 
    WHERE
    strftime('%Y', due_date) LIKE ${yy} and 
     CAST(strftime('%m', due_date) AS INTEGER) LIKE ${mm} and 
     CAST(strftime('%d', due_date) AS INTEGER) LIKE ${dd};`;
  const dateArray = await db.all(getDateQuery);
  response.send(
    dateArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
  );
});

//Add API

app.post("/todos/", ifValidBodyRequest, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
  const getTodoQuery = `
    INSERT INTO 
    todo (id, todo, priority, status, category, due_date)
    VALUES
    (${id},'${todo}','${priority}','${status}','${category}','${formattedDate}');`;

  await db.run(getTodoQuery);

  response.send("Todo Successfully Added");
});

//Update API

app.put("/todos/:todoId/", ifValidBodyRequest, async (request, response) => {
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
      category ='${category}',
      due_date = '${dueDate}'
    WHERE
      id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

//Delete API

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    DELETE FROM todo WHERE id = ${todoId};`;
  const dbResponse = await db.run(getTodoQuery);

  if (dbResponse.changes === 0) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    response.send("Todo Deleted");
  }
});

module.exports = app;
