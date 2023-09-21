/**
 * List handler for reservation resources
 */
const service = require("./tables.service");
const reservationsService = require("../reservations/reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");

async function list(req, res, next) {
  const data = await service.list();
  res.json({ data });
}

async function create(req, res, next) {
  const data = await service.create(req.body.data);
  res.status(201).json({ data });
}

async function update(req, res, next) {
  const { reservation_id, status } = res.locals.reservation;
  const { table_id } = req.params;
  if(status === "seated") {
    next({status: 400, message: "The reservation is already seated."});
  }
  const data = await service.update(table_id, reservation_id);
  res.status(200).json({ data });
}

async function finish(req, res) {
  const {table} = res.locals;
  const data = await service.finish(
    table.table_id,
    table.reservation_id
  );
  res.status(200).json({ data });
}

// The helper functions are below.

let fields = ["table_name", "capacity"];

function validateDataExists(req, res, next) {
  if (req.body.data) {
    next();
  } else {
    next({
      status: 400,
      message: `Please include a data object in your request body. ${req}`,
    });
  }
}

function createValidatorFor(field) {
  return function (req, res, next) {
    if (req.body.data[field]) {
      next();
    } else {
      next({
        status: 400,
        message: `Please include ${field} in the request data`,
      });
    }
  };
}

function validateTabName(req, res, next) {
  const { table_name } = req.body.data;
  if (table_name.length < 2) {
    next({
      status: 400,
      message: "table_name must be at least 2 characters long",
    });
  } else {
    next();
  }
}

function validateTableCap(req, res, next) {
  const { capacity } = req.body.data;
  if (typeof capacity !== "number") {
    next({
      status: 400,
      message: `Invalid, capacity must be a number: ${capacity}`,
    });
  } else {
    next();
  }
}

// Check if reservation_id exists and whether it has an existing reservation.
async function validateReservationId(req, res, next) {
  const { reservation_id } = req.body.data;
  if (!reservation_id) {
    next({
      status: 400,
      message: "request data must contain a reservation_id",
    });
  } else {
    const data = await reservationsService.read(reservation_id);
    if (!data) {
      next({
        status: 404,
        message: `could not find reservation with reservation_id: ${reservation_id}`,
      });
    } else {
      res.locals.reservation = data;
      next();
    }
  }
}

// This is to check if the table for the given table_id is available for reservation. 
async function validateCapacityAndAvailability(req, res, next) {
  const { table_id } = req.params;
  const data = await service.read(table_id);
  if (!data) {
    next({
      status: 404,
      message: `No tables found with table_id: ${table_id}`,
    });
  } else {
    console.log(data);
    res.locals.table = data;
    // Check if res party size exceeds the table cap.
    if (res.locals.reservation.people > res.locals.table.capacity) {
      next({
        status: 400,
        message: "This reservations party size exceeds the tables capacity",
      });
    }
    if (res.locals.table.reservation_id !== null) {
      next({ status: 400, message: "Table is already occupied" });
    } else {
      next();
    }
  }
}

// To check if a table is occupied or not using the table_id. 
async function validateOccupiedTable(req, res, next) {
  const { table_id } = req.params;
  const foundTable = await service.read(table_id);
  if (foundTable) {
    // If table exists, check if it has a reservation_id otherwise invoke 'next'.
    if (!foundTable.reservation_id) {
      next({
        status: 400,
        message: "Table not occupied",
      });
    } else {
      res.locals.table = foundTable;
      next();
    }
  } else {
    next({
      status: 404,
      message: `Table ${table_id} Could Not Be Found.`,
    });
  }
}

module.exports = {
  list: asyncErrorBoundary(list),
  create: [
    validateDataExists,
    ...fields.map(createValidatorFor),
    validateTabName,
    validateTableCap,
    asyncErrorBoundary(create),
  ],
  update: [
    validateDataExists,
    asyncErrorBoundary(validateReservationId),
    asyncErrorBoundary(validateCapacityAndAvailability),
    asyncErrorBoundary(update),
  ],
  finish: [
    asyncErrorBoundary(validateOccupiedTable),
    asyncErrorBoundary(finish),
  ],
};
