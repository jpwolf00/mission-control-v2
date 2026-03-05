# Mission Control 2.0 - User Guide

## What is Mission Control?

Mission Control is an AI-native orchestration platform that manages software development workflows with built-in quality gates. It ensures every code change goes through proper review and testing before reaching production.

---

## Getting Started

### Accessing Mission Control

Open your browser and navigate to:
- **Development:** http://localhost:3000
- **QA:** http://localhost:3001  
- **Production:** http://your-domain.com

---

## Dashboard

The dashboard shows:
- **Active Stories:** Work currently in progress
- **Success Rate:** Percentage of successful deployments
- **Average Gate Time:** How long stories take to complete
- **System Status:** Overall health of the platform

![Dashboard Overview](docs/images/dashboard.png)

---

## Working with Stories

### What is a Story?

A story represents a unit of work — a feature, bug fix, or task. Stories flow through gates from design to production.

### Creating a Story

1. Click **"Create Story"** on the Stories page
2. Fill in:
   - **Title:** Brief description (e.g., "Add user login")
   - **Description:** Detailed requirements
   - **Priority:** Low, Medium, High, or Critical
   - **Acceptance Criteria:** Checklist of what "done" means
3. Click **Save**

### Story Lifecycle

```
Draft → Approved → Active → Completed
```

| Status | Meaning | Next Step |
|--------|---------|-----------|
| **Draft** | Created, not ready | Approve requirements |
| **Approved** | Ready to build | Dispatch to architect |
| **Active** | Being worked on | Complete gates |
| **Completed** | Done and deployed | Archive |

### Viewing Stories

The **Stories** page shows a Kanban board:
- **Draft:** New stories waiting for approval
- **Approved:** Ready to start development
- **Active:** Currently being worked on
- **Completed:** Finished stories

Click any story to see details and progress.

---

## The Gate Pipeline

Stories must pass through five gates before production:

### 1. Architect Gate
**What happens:** Design and planning  
**Required:** Specification document (SPEC.md)  
**Who:** AI architect agent  

### 2. Implementer Gate  
**What happens:** Code is written and tested  
**Required:** Working code + passing tests  
**Who:** AI implementer agent

### 3. Reviewer-A Gate
**What happens:** Quality assurance  
**Required:** API tests pass, no bugs  
**Who:** AI reviewer agent

### 4. Operator Gate
**What happens:** Deployed to production  
**Required:** Successful deployment  
**Who:** AI operator agent

### 5. Reviewer-B Gate
**What happens:** Production validation  
**Required:** Health checks pass  
**Who:** AI reviewer agent

---

## Deployments

### Viewing Deployments

Go to the **Deploy** page to see:
- Current versions in each environment
- Deployment history
- Rollback options

### Rolling Back

If a deployment fails:

1. Go to **Deploy** page
2. Find the failed deployment in history
3. Click **"Rollback"**
4. Confirm the rollback

The system automatically:
- Restores the previous database backup
- Reverts to the previous application version
- Verifies the rollback succeeded

### Promotion Path

```
Dev → QA → Production
```

1. **Dev:** Develop and test locally
2. **QA:** Automatic deployment, must pass tests
3. **Production:** Manual approval required

---

## Monitoring

### Health Status

Check system health at:
- Dashboard widget (green/yellow/red)
- API: `GET /api/v1/health`

### Notifications

Mission Control can notify you via:
- **Slack:** Webhook integration
- **Email:** SMTP configuration

Configure in Settings (coming soon).

---

## Best Practices

### Writing Good Stories

✅ **Do:**
- Write clear acceptance criteria
- Set realistic priority levels
- Include context and background

❌ **Don't:**
- Create stories without acceptance criteria
- Mark Critical priority for minor tasks
- Leave stories in Draft indefinitely

### Gate Completion

- Each gate requires specific evidence
- Don't rush through gates
- Fix issues before moving forward
- Use rollback if something breaks

### Working with AI Agents

- AI agents work on dispatched stories
- They create artifacts (documents, code)
- Review their work before approving
- You can pause or restart agents

---

## Troubleshooting

### Story Stuck in a Gate

If a story hasn't progressed:

1. Check the **Activity Log** on the story detail page
2. Look for error messages
3. Click **"Retry Gate"** if available
4. Contact admin if stuck >30 minutes

### Deployment Failed

If deployment to production fails:

1. Check the error message in the Deploy page
2. Review QA test results
3. Fix the issue in dev/QA first
4. Retry deployment

### Can't Access Mission Control

1. Check your network connection
2. Verify the URL is correct
3. Check if the service is running:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Quick search (coming soon) |
| `N` | New story (on Stories page) |
| `R` | Refresh data |
| `?` | Show keyboard shortcuts |

---

## Glossary

| Term | Definition |
|------|------------|
| **Story** | A unit of work (feature, bug, task) |
| **Gate** | A quality checkpoint in the pipeline |
| **Gate Evidence** | Proof that gate requirements are met |
| **Dispatch** | Assign a story to an AI agent |
| **Rollback** | Revert to previous version |
| **Environment** | Dev, QA, or Production instance |

---

## Getting Help

- **Documentation:** See `docs/` folder
- **Issues:** GitHub Issues
- **Status:** Check `/api/v1/health`

---

## What's Next?

Mission Control is evolving:

- [ ] User authentication
- [ ] Custom gate configurations
- [ ] Metrics dashboard
- [ ] Mobile app
- [ ] Integration with GitHub/GitLab