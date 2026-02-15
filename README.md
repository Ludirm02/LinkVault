# LinkVault

LinkVault is a secure, ephemeral file-sharing application designed for privacy and simplicity. It allows authenticated and anonymous users to share files and text with strict expiration rules, password protection, download limits, and "burn after reading" capabilities.

---

## Tech Stack  
* **Frontend:** React, Vite, TailwindCSS
* **Backend:** Node.js, Express
* **Database:** MongoDB, Mongoose
* **Storage:** Cloudinary (with local disk buffering)
* **Security:** Bcrypt, Crypto, JWT, strict access checks

----

## Setup Instructions

These steps can be followed to run the application locally.

### 1. Prerequisites

- Node.js (v20 recommended)
- MongoDB (Local or Atlas URI)
- Cloudinary Account (for file storage)

---


### 2. Installation

#### Clone the Repository

```bash
git clone https://github.com/Ludirm02/LinkVault.git
cd LinkVault
```

---

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MAX_FILE_SIZE_MB=10
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:5000
CLOUDINARY_DEBUG_ERRORS=false
```

---

### Frontend Setup

```bash
cd ../frontend
npm install
```

---

### 3. Running the Application

#### Start the Backend

```bash
# Inside /backend directory
npm run dev
```

Backend runs at:
```
http://localhost:5000
```

---

#### Start the Frontend

```bash
# Inside /frontend directory
npm run dev
```

Frontend runs at:
```
http://localhost:5173
```

---
##  API Overview


### Upload Routes

**POST** `/api/upload`  
Upload a file or secure text content.  
Returns a unique shareable ID and a delete token.  
Auth: Optional  

---

**GET** `/api/upload/:id`  
Fetch metadata about the upload (type, name, expiration status).  
Does not expose sensitive fields such as password hash or delete token.  
Auth: Public  

---

**GET** `/api/upload/download/:id`  
Securely stream the uploaded file.  
Enforces password protection, expiry checks, and atomic download limit validation.  
For password-protected files, send password in request header: `x-link-password`.  
Returns 403 if link is invalid, expired, or download limit is reached.  
Auth: Public  

---

**POST** `/api/upload/delete/:id`  
Delete uploaded content using either:  
• Valid delete token  
• Owner authentication (JWT)  
Auth: Optional  

---

**GET** `/api/upload/my/list`  
Retrieve upload history of the authenticated user.  
Excludes sensitive fields (password, deleteToken).  
Auth: User Required  

---

### Authentication Routes

**POST** `/api/auth/register`  
Create a new user account.  
Stores hashed password securely in database.  

---

**POST** `/api/auth/login`  
Authenticate user and return JWT token.  
Token must be included in protected routes via request headers.  

---------------------------

##  Design Decisions

### 1. Hybrid Storage Strategy (Disk + Cloud)

We use **multer with DiskStorage** instead of MemoryStorage.

Reason:
- MemoryStorage buffers files into RAM.
- Multiple large uploads could crash the Node.js process due to Out-Of-Memory errors.

Flow:
```
Upload → Temporary Disk → Cloudinary → Delete Temp File
```

This ensures stability and scalability.

---

### 2. Strict Atomic Download Limit

To prevent bypass via rapid clicking or concurrent requests:

We use MongoDB atomic conditional update:

```js
const updatedDoc = await Upload.findOneAndUpdate(
  { uniqueId, currentDownloads: { $lt: maxDownloads } },
  { $inc: { currentDownloads: 1 } },
  { new: true }
);

```

If condition fails, request returns **403 Forbidden**.

This prevents race conditions completely.  
Text links are counted on metadata view; file links are counted on actual download request.

---

### 3. Security by Obscurity & Response Hardening

- API returns **403 Forbidden** for both invalid and expired links.
- This prevents brute-force ID discovery.
- Password hashes and deleteTokens are stripped from all JSON responses.
- File downloads are always gated through backend — raw Cloudinary URLs are never exposed.
- Security response headers are set (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

---

### 4. Background Expiry Cleanup (Cron Job)

A `node-cron` job runs periodically to:

- Identify expired uploads
- Delete MongoDB records
- Delete Cloudinary files

This ensures true ephemeral behavior even if a link is never accessed.

---

### 5. 16-Byte Cryptographic IDs

We generate IDs using:

```js
crypto.randomBytes(16).toString("hex")
```

This produces 32-character hex IDs, making brute-force attacks mathematically infeasible.

---

##  Assumptions & Limitations

### Assumptions

- Cloudinary API is available and operational.
- Server system time (UTC) is synchronized correctly.
- Single file per upload for simplified UX.

---

### Limitations

- File size capped at 10MB by default (configurable via `.env`; keep aligned with your Cloudinary plan).
- No resumable uploads.
- No audit logging (privacy-focused design).
- Free-tier Cloudinary bandwidth limitations apply.
- No horizontal scaling implemented (single-node architecture).

---

##  Security Features Summary

- Password-protected links
- One-time view (burn after reading)
- Maximum download limit
- Atomic limit enforcement
- Expiry-based deletion
- Delete token for manual removal
- JWT-based optional authentication

---

##  Project Structure

Data flow diagram file: `DATA_FLOW_DIAGRAM.md`

```
linkvault/
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── uploads/
│   └── server.js
│
└── frontend/
    ├── src/
    ├── components/
    └── pages/
```

---

##  Future Improvements

- S3-compatible storage support
- Rate limiting
- CDN integration
- Resumable uploads
- Admin dashboard
- Docker deployment configuration

---
