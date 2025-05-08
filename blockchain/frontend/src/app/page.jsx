"use client";
import React, { useEffect, useState } from "react";
import web3 from "./utils/web3";
import contract from "./utils/contract";

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
    ownerName: "",
    locationAddress: "",
    areaSize: "",
    pictureHash: "",
    docHash: "",
  });
  const [landPapers, setLandPapers] = useState([]);
  const [reviewedMap, setReviewedMap] = useState({});

  const isAdmin = role === ROLE.Admin;
  const isOfficer = role === ROLE.Officer;
  const isSubmitter = role === ROLE.Submitter;

  useEffect(() => {
    async function loadRole() {
      const accounts = await web3.eth.getAccounts();
      const acc = accounts[0];
      setAccount(acc);

      const roleIndexStr = await contract.methods.getRole(acc).call();
      setRole(parseInt(roleIndexStr, 10));
    }
    loadRole();
  }, []);

  // only allow submit when all fields are filled
  const isSubmitFormValid =
    form.ownerName.trim() !== "" &&
    form.locationAddress.trim() !== "" &&
    form.areaSize.trim() !== "" &&
    form.pictureHash !== "" &&
    form.docHash.trim() !== "";

  const handleSubmit = async () => {
    try {
      await contract.methods
        .submitLand(
          form.ownerName,
          form.locationAddress,
          form.areaSize,
          form.pictureHash,
          form.docHash
        )
        .send({ from: account });

      alert("Land submitted!");
      setForm({
        ownerName: "",
        locationAddress: "",
        areaSize: "",
        pictureHash: "",
        docHash: "",
      });
    } catch (err) {
      console.error(err);
      alert("Submission failed: " + err.message);
    }
  };

  const loadAllLandPapers = async () => {
    const ids = Array.from({ length: 10 }, (_, i) => i);
    const results = await Promise.all(
      ids.map((id) =>
        contract.methods.getLand(id).call().catch(() => null)
      )
    );

    // only keep papers where id > 0
    const clean = results.filter((x) => x && Number(x.id) > 0);
    setLandPapers(clean);

    if (isOfficer) {
      const reviews = {};
      for (const paper of clean) {
        reviews[paper.id] = await contract.methods
          .hasReviewed(paper.id, account)
          .call();
      }
      setReviewedMap(reviews);
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
      <h1 style={styles.title}>Land Registry PoC?sdsd</h1>
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
            placeholder="Owner Name"
            style={styles.input}
            value={form.ownerName}
            onChange={(e) =>
              setForm({ ...form, ownerName: e.target.value })
            }
          />
          <input
            placeholder="Location Address"
            style={styles.input}
            value={form.locationAddress}
            onChange={(e) =>
              setForm({ ...form, locationAddress: e.target.value })
            }
          />
          <input
            placeholder="Area Size"
            style={styles.input}
            value={form.areaSize}
            onChange={(e) =>
              setForm({ ...form, areaSize: e.target.value })
            }
          />
          <input
            type="file"
            accept="image/*"
            style={styles.input}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const data = new FormData();
              data.append("file", file);
              const res = await fetch("/api/upload", {
                method: "POST",
                body: data,
              });
              const { url } = await res.json();
              setForm({ ...form, pictureHash: url });
            }}
          />
          {form.pictureHash && (
            <img
              src={form.pictureHash}
              alt="Preview"
              style={styles.preview}
            />
          )}
          <input
            placeholder="Document Hash"
            style={styles.input}
            value={form.docHash}
            onChange={(e) =>
              setForm({ ...form, docHash: e.target.value })
            }
          />
          <button
            onClick={handleSubmit}
            disabled={!isSubmitFormValid}
            style={{
              ...styles.button,
              opacity: isSubmitFormValid ? 1 : 0.5,
              cursor: isSubmitFormValid ? "pointer" : "not-allowed",
            }}
          >
            Submit
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
                <p><strong>Location:</strong> {paper.details.locationAddress}</p>
                <p><strong>Area:</strong> {paper.details.areaSize}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  {["Pending", "Approved", "Rejected"][statusIndex]}
                </p>
                {paper.details.pictureHash && (
                  <img
                    src={paper.details.pictureHash}
                    alt={`Land #${paper.id}`}
                    style={styles.preview}
                  />
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
                  <div
                    style={{
                      marginTop: "1rem",
                      display: "flex",
                      gap: "1rem",
                    }}
                  >
                    <button
                      style={{ ...styles.button, background: "#1C6944" }}
                      onClick={() => reviewLand(paper.id, true)}
                    >
                      ✅ Approve
                    </button>
                    <button
                      style={{ ...styles.button, background: "#B91C1C" }}
                      onClick={() => reviewLand(paper.id, false)}
                    >
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
};
