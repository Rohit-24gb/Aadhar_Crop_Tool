const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { PDFDocument } = require("pdf-lib");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage });

app.use(express.urlencoded({ extended: true }));

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const password = req.body.password || "";
    const inputPath = req.file.path;
    let pdfPathToCrop = inputPath;

    // STEP 1 → Decrypt if password provided
    if (password.trim()) {
      const decryptedPath = inputPath.replace(".pdf", "_decrypted.pdf");

      console.log("Running Python decrypt script...");

      try {
        execSync(
          `python decrypt_pdf.py "${inputPath}" "${password}" "${decryptedPath}"`,
          { stdio: "inherit" }
        );
      } catch (error) {
        throw new Error("Failed to decrypt PDF. Wrong password?");
      }

      // Use decrypted file for cropping
      pdfPathToCrop = decryptedPath;
    }

    // STEP 2 → Load PDF
    const pdfBytes = fs.readFileSync(pdfPathToCrop);
    const srcPdf = await PDFDocument.load(pdfBytes);

    const newPdf = await PDFDocument.create();

    for (const page of srcPdf.getPages()) {
      const { width, height } = page.getSize();

      const left = 50;
      const right = 49;
      const top = 572;
      const bottom = 57;

      const newWidth = width - (left + right);
      const newHeight = height - (top + bottom);

      if (newWidth <= 0 || newHeight <= 0) {
        throw new Error("Crop size too large for this page.");
      }

      const embeddedPage = await newPdf.embedPage(
        page,
        {
          left,
          bottom,
          right: width - right,
          top: height - top,
        }
      );

      const newPage = newPdf.addPage([newWidth, newHeight]);

      newPage.drawPage(embeddedPage, {
        x: 0,
        y: 0,
      });

      console.log(
        `Page cropped → new size: ${newWidth} x ${newHeight}`
      );
    }

    const croppedBytes = await newPdf.save();

    const outputPath = pdfPathToCrop.replace(".pdf", "_cropped.pdf");
    fs.writeFileSync(outputPath, croppedBytes);

    // Clean up temporary files
    if (pdfPathToCrop !== inputPath) {
      fs.unlinkSync(pdfPathToCrop);
    }
    fs.unlinkSync(inputPath);

    res.send(`
      <h2>✅ Cropping complete!</h2>
      <a href="/download/${path.basename(outputPath)}" download>
        Download Cropped PDF
      </a>
      <br /><br /><a href="/">Go Back</a>
    `);
  } catch (error) {
    console.error(error);
    res.send(`<h2>❌ Error: ${error.message}</h2><a href="/">Try Again</a>`);
  }
});

app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  res.download(filePath, (err) => {
    if (!err) {
      fs.unlinkSync(filePath);
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});






// ---------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------




// const express = require("express");
// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");
// const { PDFDocument } = require("pdf-lib");

// const app = express();
// const PORT = 3000;

// app.use(express.static("public"));

// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (_, file, cb) => {
//     cb(null, Date.now() + "_" + file.originalname);
//   },
// });
// const upload = multer({ storage });

// app.post("/upload", upload.single("pdf"), async (req, res) => {
//   try {
//     const inputPath = req.file.path;
//     const outputPath = inputPath.replace(".pdf", "_cropped.pdf");

//     const pdfBytes = fs.readFileSync(inputPath);
//     const srcPdf = await PDFDocument.load(pdfBytes);

//     const newPdf = await PDFDocument.create();

//     for (const page of srcPdf.getPages()) {
//       const { width, height } = page.getSize();

//       const left = 100;
//       const right = 100;
//       const top = 500;
//       const bottom = 200;

//       const newWidth = width - (left + right);
//       const newHeight = height - (top + bottom);

//       if (newWidth <= 0 || newHeight <= 0) {
//         throw new Error("Crop size too large for this page.");
//       }

//       // Embed cropped region from original page
//       const embeddedPage = await newPdf.embedPage(
//         page,
//         {
//           left,
//           bottom,
//           right: width - right,
//           top: height - top
//         }
//       );

//       // Create new page with cropped size
//       const newPage = newPdf.addPage([newWidth, newHeight]);

//       // Draw embedded cropped page at (0,0)
//       newPage.drawPage(embeddedPage, {
//         x: 0,
//         y: 0,
//       });

//       console.log(
//         `Page cropped → new size: ${newWidth} x ${newHeight}`
//       );
//     }

//     const croppedBytes = await newPdf.save();
//     fs.writeFileSync(outputPath, croppedBytes);

//     res.send(`
//       <h2>✅ Cropping complete!</h2>
//       <a href="/download/${path.basename(outputPath)}" download>
//         Download Cropped PDF
//       </a>
//       <br /><br /><a href="/">Go Back</a>
//     `);

//     fs.unlinkSync(inputPath);
//   } catch (error) {
//     console.error(error);
//     res.send(`<h2>❌ Error: ${error.message}</h2><a href="/">Try Again</a>`);
//   }
// });

// app.get("/download/:filename", (req, res) => {
//   const filePath = path.join(__dirname, "uploads", req.params.filename);
//   res.download(filePath, (err) => {
//     if (!err) {
//       fs.unlinkSync(filePath);
//     }
//   });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });
