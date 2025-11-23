document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Add cache-busting to ensure we always get fresh activity data
      const response = await fetch(`/activities?_=${Date.now()}`, { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Render main card content and a participants container we will populate below
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            <div class="participants-container" aria-live="polite"></div>
          </div>
        `;

        // Populate participants list (bulleted). Handles string entries or objects with name/email.
        const participantsContainer = activityCard.querySelector(".participants-container");
        if (details.participants && details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            // graceful handling for different participant shapes
            let emailText;
            if (typeof p === "string") {
              emailText = p;
            } else if (p && typeof p === "object") {
              emailText = p.email || p.name || JSON.stringify(p);
            } else {
              emailText = String(p);
            }

            const span = document.createElement("span");
            span.className = "participant-email";
            span.textContent = emailText;

            const del = document.createElement("button");
            del.className = "delete-participant";
            del.setAttribute("aria-label", `Unregister ${emailText} from ${name}`);
            del.dataset.email = emailText;
            del.dataset.activity = name;
            del.type = "button";
            del.innerHTML = "&times;";

            li.appendChild(span);
            li.appendChild(del);
            ul.appendChild(li);
          });
          participantsContainer.appendChild(ul);
        } else {
          const none = document.createElement("p");
          none.className = "no-participants";
          none.textContent = "No participants yet. Be the first to sign up!";
          participantsContainer.appendChild(none);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so UI shows the newly signed up participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event delegation for delete/unregister buttons
  activitiesList.addEventListener("click", async (ev) => {
    const target = ev.target;
    if (target && target.classList && target.classList.contains("delete-participant")) {
      const email = target.dataset.email;
      const activity = target.dataset.activity;

      if (!email || !activity) return;

      // disable button while processing
      target.disabled = true;

      try {
        const res = await fetch(
          `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );

        const result = await res.json();
        if (res.ok) {
          // remove the list item
          const li = target.closest("li.participant-item");
          if (li) li.remove();

          // If no participants remain, replace with 'no participants' text
          const participantsContainer = target.closest(".participants-container");
          if (participantsContainer) {
            const ul = participantsContainer.querySelector("ul.participants-list");
            if (!ul || ul.children.length === 0) {
              participantsContainer.innerHTML = '<p class="no-participants">No participants yet. Be the first to sign up!</p>';
            }
          }
        } else {
          console.error("Failed to unregister:", result);
          alert(result.detail || "Failed to unregister participant");
        }
      } catch (err) {
        console.error("Error unregistering:", err);
        alert("Error unregistering participant. See console for details.");
      } finally {
        target.disabled = false;
      }
    }
  });

  // Initialize app
  fetchActivities();
});
