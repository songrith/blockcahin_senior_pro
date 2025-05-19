"use client";
import React, { useEffect, useState } from "react";
import web3 from "./utils/web3";
import contract from "./utils/contract";
import { keccak256 } from "js-sha3";

const ROLE = {
  None: 0,
  Submitter: 1,
  Officer: 2,
  Admin: 3,
};

export default function Home() {
  const [account, setAccount] = useState("");
  const [role, setRole] = useState(ROLE.None);
  const [newOfficerAddress, setNewOfficerAddress] = useState("");
  const [form, setForm] = useState({
    id: "",
    ownerName: "",
    locationAddress: "",
    areaSize: "",
    picturePreview: "",
    pictureHash: "",
    pictureUrl: "",
    docHash: "",
  });
  const [landPapers, setLandPapers] = useState([]);
  const [reviewedMap, setReviewedMap] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = role === ROLE.Admin;
  const isOfficer = role === ROLE.Officer;
  const isSubmitter = role === ROLE.Submitter;

  useEffect(() => {
    async function loadRole() {
      const accounts = await web3.eth.getAccounts();
      const addr = accounts[0] || "";
      setAccount(addr);
      const onChainRole = await contract.methods.getRole(addr).call();
      setRole(Number(onChainRole));
    }
    loadRole();
  }, []);

  const isSubmitFormValid =
    form.id.trim() &&
    form.ownerName.trim() &&
    form.locationAddress.trim() &&
    form.areaSize.trim() &&
    form.pictureHash &&
    form.pictureUrl;

  const handlePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const buffer = await file.arrayBuffer();
    const hash = "0x" + keccak256(new Uint8Array(buffer));
    const data = new FormData();
    data.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: data });
    const { url: uploadedUrl } = await res.json();
    setForm((f) => ({ ...f, picturePreview: previewUrl, pictureHash: hash, pictureUrl: uploadedUrl }));
  };

    const handleSubmit = async () => {
    if (!isSubmitFormValid || !isSubmitter) return;
    setSubmitting(true);
    try {
      const landId = Number(form.id);
      const detailsTuple = [
        landId,
        form.ownerName,
        form.locationAddress,
        form.areaSize,
        form.pictureHash,
        form.pictureUrl,
      ];
      await contract.methods
        .submitLand(detailsTuple, form.docHash || "")
        .send({ from: account });
      // Reset form
      setForm({
        id: "",
        ownerName: "",
        locationAddress: "",
        areaSize: "",
        picturePreview: "",
        pictureHash: "",
        pictureUrl: "",
        docHash: "",
      });
      alert("Land submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Load & flatten land papers
 const loadAllLandPapers = async () => {
  let ids = [];
  try {
    const events = await contract.getPastEvents("Submitted", {
      fromBlock:184,
      toBlock:   "latest",
    });
    // parse + dedupe
    ids = [...new Set(events.map(e => Number(e.returnValues.id)))];
  } catch (err) {
    console.error("Failed to fetch events:", err);
    return;
  }

  // fetch each paper
  const results = await Promise.all(
    ids.map(id => contract.methods.getLand(id).call().catch(() => null))
  );

  // flatten
  const clean = results
    .filter(r => r)
    .map(r => ({
      id:      Number(r.details.id),
      details: {
        ownerName:      r.details.ownerName,
        locationAddress:r.details.locationAddress,
        areaSize:       r.details.areaSize,
        pictureUrl:     r.details.pictureUrl,
      },
      status: Number(r.status),
    }));

  setLandPapers(clean);

  // batch‐check reviews
  if (isOfficer) {
    const reviewEntries = await Promise.all(
      clean.map(paper =>
        contract.methods
          .hasReviewed(paper.id, account)
          .call()
          .then(flag => [paper.id, flag])
      )
    );
    setReviewedMap(Object.fromEntries(reviewEntries));
  }
};


  const reviewLand = async (id, approve) => {
    try {
      await contract.methods.reviewLandMulti(id, approve).send({ from: account });
      alert(`Paper ${id} ${approve ? "approved" : "rejected"}`);
      loadAllLandPapers();
    } catch (err) {
      console.error(err);
      alert("Review failed: " + err.message);
    }
  };

  const addOfficer = async () => {
    if (!web3.utils.isAddress(newOfficerAddress)) {
      alert("Invalid address");
      return;
    }
    try {
      await contract.methods.addOfficer(newOfficerAddress).send({ from: account });
      alert("Officer added");
      setNewOfficerAddress("");
    } catch (err) {
      console.error(err);
      alert("Add officer failed: " + err.message);
    }
  };

  const roleLabel = {
    [ROLE.None]: "No Role",
    [ROLE.Submitter]: "Submitter",
    [ROLE.Officer]: "Officer",
    [ROLE.Admin]: "Admin",
  }[role];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Land Registry PoC</h1>
      <p><strong>Account:</strong> {account}</p>
      <p><strong>Role:</strong> {roleLabel}</p>

      {isAdmin && (
        <section style={styles.card}>
          <h2 style={styles.subtitle}>Add Officer</h2>
          <input
            placeholder="Officer Address"
            value={newOfficerAddress}
            onChange={(e) => setNewOfficerAddress(e.target.value)}
            style={styles.input}
          />
          <button onClick={addOfficer} style={styles.button}>
            Add Officer
          </button>
        </section>
      )}

      {isSubmitter && (
        <section style={styles.card}>
          <h2 style={styles.subtitle}>Submit Land</h2>
          <input
            placeholder="Land ID"
            style={styles.input}
            value={form.id}
            onChange={(e) => setForm({ ...form, id: e.target.value })}
          />
          <input
            placeholder="Owner Name"
            style={styles.input}
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
          <input
            placeholder="Address and information"
            style={styles.input}
            value={form.locationAddress}
            onChange={(e) => setForm({ ...form, locationAddress: e.target.value })}
          />
          <input
            placeholder="Area Size"
            style={styles.input}
            value={form.areaSize}
            onChange={(e) => setForm({ ...form, areaSize: e.target.value })}
          />

          <label>Picture (preview + hash + upload URL)</label>
          <input
            type="file"
            accept="image/*"
            style={styles.input}
            onChange={handlePictureChange}
          />
          {form.picturePreview && (
            <img src={form.picturePreview} alt="Preview" style={styles.preview} />
          )}
          {form.pictureHash && (
            <p><strong>Picture Hash:</strong> {form.pictureHash}</p>
          )}
          {form.pictureUrl && (
            <p><strong>Picture URL:</strong> <a href={form.pictureUrl} target="_blank" rel="noreferrer">{form.pictureUrl}</a></p>
          )}
       
           <button disabled={!isSubmitFormValid || submitting} onClick={handleSubmit} style={styles.button}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </section>
      )}

      {isOfficer && (
        <section style={styles.card}>
          <h2 style={styles.subtitle}>Review Submissions</h2>
          <button onClick={loadAllLandPapers} style={styles.secondaryButton}>
            Load Papers
          </button>
          {landPapers.map((paper) => {
            const statusIndex = Number(paper.status);
            const pending = statusIndex === 0;
            const hasReviewed = reviewedMap[paper.id];

            return (
              <div key={paper.id} style={styles.paperCard}>
                <p><strong>ID:</strong> {paper.id}</p>
                <p><strong>Owner:</strong> {paper.details.ownerName}</p>
                <p><strong>Address and Infromation:</strong> {paper.details.locationAddress}</p>
                <p><strong>Area:</strong> {paper.details.areaSize}</p>
                <p><strong>Status:</strong> {["Pending","Approved","Rejected"][statusIndex]}</p>
                {paper.details.pictureUrl && (
    <div className="imageContainer">
  <button
    onClick={() => window.open(paper.details.pictureUrl, "_blank")}
    style={styles.viewImageButton}
  >
    View Image
  </button>
</div>
  )}

                {!pending ? (
                  <p style={{ color: "#888", marginTop: "1rem" }}>
                    <em>This submission has been finalized.</em>
                  </p>
                ) : hasReviewed ? (
                  <p style={{ color: "#888", marginTop: "1rem" }}>
                    <em>You have reviewed this.</em>
                  </p>
                ) : (
                  <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
                    <button style={{ ...styles.button, background: "#1C6944" }} onClick={() => reviewLand(paper.id, true)}>
                      ✅ Approve
                    </button>
                    <button style={{ ...styles.button, background: "#B91C1C" }} onClick={() => reviewLand(paper.id, false)}>
                      ❌ Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "800px",
    margin: "0 auto",
    fontFamily: "system-ui",
    background: "#f9f9f9",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "1rem",
  },
  card: {
    background: "#fff",
    padding: "1.5rem",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: "2rem",
  },
  subtitle: {
    fontSize: "1.25rem",
    marginBottom: "1rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    marginBottom: "1rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "4px",
    background: "#1C6944",
    color: "#fff",
    cursor: "pointer",
    marginRight: "0.5rem",
  },
  secondaryButton: {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "4px",
    background: "#E2E8F0",
    color: "#333",
    cursor: "pointer",
    marginBottom: "1rem",
  },
  preview: {
    width: "100%",
    maxWidth: "200px",
    marginBottom: "1rem",
    borderRadius: "4px",
  },
  paperCard: {
    borderTop: "1px solid #e2e2e2",
    paddingTop: "1rem",
    marginTop: "1rem",
  },
   imageContainer: {
    display: "flex",
    flexDirection: "column",    // stack vertically
    alignItems: "center",       // center horizontally
  },
  preview: {
    maxWidth: "25%",           // responsive
    height: "auto",
    // ...any other img styles you already had
  },
  button: {
    marginTop: "0.5rem",        // space below image
    background: "#2563EB",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    borderRadius: "4px",
    // ...any other button styles you already had
  },
  imageContainer: {
    display: "flex",
    flexDirection: "column",    // stack vertically
    alignItems: "center",       // center horizontally
  },

  viewImageButton: {
    marginTop: "0.5rem",        // space below image
    background: "linear-gradient(145deg, #6e7bff, #5560ea)",  // gradient effect
    color: "#fff",
    border: "none",
    padding: "0.75rem 1.5rem",
    cursor: "pointer",
    borderRadius: "25px",       // rounded corners for a smooth look
    fontWeight: "bold",         // bolder text
    boxShadow: "2px 2px 8px rgba(0, 0, 0, 0.1)", // subtle shadow
    transition: "all 0.3s ease",  // smooth transition for hover effect
  },

  // Optional: Hover effect
  viewImageButtonHover: {
    background: "linear-gradient(145deg, #5560ea, #6e7bff)",  // reverse gradient on hover
    transform: "scale(1.05)",    // slightly enlarge button on hover
    boxShadow: "4px 4px 12px rgba(0, 0, 0, 0.15)", // stronger shadow on hover
  }
};
