import React, { useEffect, useState } from "react";
import {
  listReservations,
  listTables,
  finishTable,
  changeReservationStatus,
} from "../../utils/api";
import useQuery from "../../utils/useQuery";
import ErrorAlert from "../../layout/ErrorAlert";
import { Link } from "react-router-dom/cjs/react-router-dom.min";

/**
 * Defines the dashboard page.
 * @param date
 *  the date for which the user wants to view reservations.
 * @returns {JSX.Element}
 */
function Dashboard({ date }) {
  const [reservations, setReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [reservationsError, setReservationsError] = useState(null);
  const query = useQuery();
  const dateQuery = query.get("date");
  const [tablesError, setTablesError] = useState(null);
  const [currentDate, setCurrentDate] = useState(dateQuery ? dateQuery : date); // Add currentDate state

  useEffect(loadDashboard, [currentDate]); // Use currentDate in useEffect to load dashboard every time the date changes

  function loadDashboard() {
    const abortController = new AbortController();
    setReservationsError(null);
    listReservations({ date: currentDate }, abortController.signal) // Use currentDate for fetching reservations
      .then(setReservations)
      .catch(setReservationsError);
    listTables(abortController.signal).then(setTables).catch(setTablesError);
    return () => abortController.abort();
  }

  const handleFinish = async (table_id) =>{
    try {
      if (
        window.confirm(
          "Is this table ready to seat new guests? This cannot be undone."
        )
      ) {
        await finishTable(table_id);
        loadDashboard();
      }
    } catch (error) {
      setTablesError(error);
    }
  };

  const handleCancel = async (reservation) =>{
    try {
      if (
        window.confirm(
          "Do you want to cancel this reservation? This cannot be undone."
        )
      ) {
        await changeReservationStatus(reservation, "cancelled");
        loadDashboard();
      }
    } catch (error) {
      setReservationsError(error);
    }
  };

  function handlePrevious() {
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    setCurrentDate(previousDate.toISOString().split("T")[0]);
  }

  function handleNext() {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate.toISOString().split("T")[0]);
  }

  function handleToday() {
    const today = new Date().toISOString().split("T")[0];
    setCurrentDate(today);
  }

  return (
    <React.Fragment>
      <main className="dashboard">
        <h4 className="display-1 text-center m-4 p-6">Dashboard</h4>
        <div className="row d-flex justify-content-center">
          <div className="col-4 mr-4">
            <div className="card border-3 shadow">
              <div className="card-body">
                <h4 className="card-title text-center display-5 font-weight-bold m-2">
                  Reservations for {currentDate}
                </h4>
                <div className="reservation-table">
                  <div className="table-responsive">
                    <table className="table table-striped table-hover table-bordered">
                      <thead>
                        <tr>
                          <th scope="col" className="text-nowrap">
                            First Name
                          </th>
                          <th scope="col" className="text-nowrap">
                            Last Name
                          </th>
                          <th scope="col" className="text-nowrap">
                            Time
                          </th>
                          <th scope="col" className="text-nowrap">
                            Phone 
                          </th>
                          <th scope="col" className="text-nowrap">
                            Party Size
                          </th>
                          <th scope="col" className="text-nowrap">
                            Status
                          </th>
                          <th scope="col" className="text-nowrap">
                            Actions
                          </th>
                          <th scope="col" className="text-nowrap"></th>
                          {/* Add an empty table header */}
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((reservation) =>{
                          const {
                            reservation_id,
                            first_name,
                            last_name,
                            reservation_time,
                            mobile_number,
                            people,
                            status,
                          } = reservation;
                          const timeParts = reservation_time.split(":");
                          const hours = parseInt(timeParts[0], 10);
                          const minutes = parseInt(timeParts[1], 10);
                          const period = hours >= 12 ? "PM" : "AM";
                          const formattedHours =
                            hours > 12 ? hours - 12 : hours;
                          const formattedMinutes = minutes
                            .toString()
                            .padStart(2, "0");
                          const formattedTime = `${formattedHours}:${formattedMinutes} ${period}`;
                          if (reservation.status !== "finished") {
                            return (
                              <tr
                                key={reservation_id}
                                className="text-center font-weight-bold text-nowrap"
                              >
                                <td>{first_name}</td>
                                <td>{last_name}</td>
                                <td>{formattedTime}</td>
                                <td>{mobile_number}</td>
                                <td>{people}</td>
                                <td data-reservation-id-status={reservation_id}>
                                  {status}
                                </td>
                                <td>
                                  {status === "booked" && (
                                    <Link
                                      className="btn btn-success font-weight-bold"
                                      to={`/reservations/${reservation_id}/seat`}
                                    >
                                      Seat
                                    </Link>
                                  )}
                                </td>
                                <td>
                                  <Link
                                    className="btn btn-warning font-weight-bold"
                                    to={`/reservations/${reservation_id}/edit`}
                                  >
                                    Edit
                                  </Link>
                                </td>
                                <td>
                                  <button
                                    className="cancel-button btn btn-danger font-weight-bold"
                                    data-reservation-id-cancel={
                                      reservation.reservation_id
                                    }
                                    onClick={() => handleCancel(reservation)}
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                          else{
                            return null;
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="container">
                  <div className="d-flex justify-content-center">
                    <button
                      className="btn btn-primary mr-3"
                      onClick={handlePrevious}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-primary mr-2"
                      onClick={handleToday}
                    >
                      Today
                    </button>
                    <button className="btn btn-primary ml-2" onClick={handleNext}>
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="container">
              <div className="card border-3 shadow">
                <div className="card-body">
                  <h4 className="card-title text-center display-5 font-weight-bold m-2">
                    Tables
                  </h4>
                  <table className="table table-striped table-hover table-bordered">
                    <thead>
                      <tr>
                        <th>Table Name</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.map((table) =>{
                        const status = table.reservation_id
                          ? "Occupied"
                          : "Free";
                        return (
                          <tr key={table.table_id}>
                            <td>{table.table_name}</td>
                            <td>{table.capacity}</td>
                            <td data-table-id-status={table.table_id}>
                              {status}
                            </td>
                            <td>
                              {table.reservation_id && (
                                <button
                                  className="btn btn-danger"
                                  data-table-id-finish={table.table_id}
                                  onClick={() => handleFinish(table.table_id)}
                                >
                                  Finish
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ErrorAlert error={reservationsError} />
        <ErrorAlert error={tablesError} />
        {/* {JSON.stringify(reservations)} */}
      </main>
    </React.Fragment>
  );
}

export default Dashboard;
