# Country Data API

A Node.js and Express API that fetches country and currency exchange rate data from external sources, processes it, stores it in a MongoDB database, and provides RESTful endpoints to query this data. It also includes a feature to generate a dynamic summary image of the data.

## Features

- Fetches and refreshes data from external APIs (`restcountries.com`, `open.er-api.com`).
- Calculates an estimated GDP for each country based on population and exchange rates.
- Stores processed data in a MongoDB database for fast and persistent access.
- Provides RESTful endpoints for querying countries with filtering and sorting capabilities.
- Generates a dynamic summary image (`.png`) with key statistics.
- Graceful error handling and structured JSON responses.

## Setup and Installation

Follow these steps to get the project running on your local machine.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create an environment file:**
    Create a `.env` file in the root of the project. You can copy the example file:
    ```bash
    cp .env.example .env
    ```

4.  **Configure environment variables:**
    Open the `.env` file and add your configuration details:
    -   `PORT`: The port the server will run on (e.g., `3000`).
    -   `MONGO_URI`: Your MongoDB connection string.

5.  **Start the server:**
    ```bash
    npm start
    ```
    The API should now be running on the port you specified (e.g., `http://localhost:3000`).

## API Documentation

All endpoints are prefixed with `/api/v1`.

---

### `POST /countries/refresh`

Fetches the latest data from external APIs, processes it, calculates estimated GDP, and updates the local database. It also generates a new `summary.png` image. This can be a long-running operation.

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "Cache refreshed successfully",
  "countries_processed": 250
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "error": "External data source unavailable",
  "details": "Could not fetch data from restcountries.com"
}
```

---

### `GET /countries`

Retrieves a list of all countries from the database. Supports filtering and sorting via query parameters.

**Query Parameters:**
-   `region` (string): Filter countries by region (e.g., `?region=Africa`).
-   `currency` (string): Filter countries by currency code (e.g., `?currency=EUR`).
-   `sort` (string): Sort the results. Options: `gdp_desc`, `gdp_asc`, `population_desc`, `population_asc`.

**Example Request:**
`GET /api/v1/countries?region=Europe&sort=gdp_desc`

**Example Response (200 OK):**
```json
[
  {
    "_id": "60d5f1b4c3a2b5a2b8f3b3a0",
    "name": "Germany",
    "capital": "Berlin",
    "region": "Europe",
    "population": 83783942,
    "currency_code": "EUR",
    "exchange_rate": 1.08,
    "estimated_gdp": 123456789012.34,
    "flag_url": "https://flagcdn.com/de.svg"
  }
]
```

---

### `GET /countries/:name`

Retrieves a single country by its name (case-insensitive).

**Example Request:**
`GET /api/v1/countries/Nigeria`

**Example Response (200 OK):**
```json
{
  "_id": "60d5f1b4c3a2b5a2b8f3b3a1",
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "population": 206139587,
  "currency_code": "NGN",
  "exchange_rate": 1450.5,
  "estimated_gdp": 21345678901.23,
  "flag_url": "https://flagcdn.com/ng.svg"
}
```

---

### `DELETE /countries/:name`

Deletes a single country from the database by its name (case-insensitive).

**Example Response (200 OK):**
```json
{
  "message": "Country deleted successfully"
}
```

---

### `GET /status`

Retrieves the status of the data cache, including the total number of countries and the last refresh timestamp.

**Example Response (200 OK):**
```json
{
  "_id": "60d5f1b4c3a2b5a2b8f3b3a2",
  "last_refreshed_at": "2023-10-27T10:00:00.000Z",
  "total_countries": 250
}
```

---

### `GET /countries/image`

Serves the `summary.png` image file, which contains a visual summary of the country data.

**Response:**
-   A `Content-Type: image/png` response with the image data.
-   A `404 Not Found` if the image has not been generated yet (run `POST /countries/refresh` first).