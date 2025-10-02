# Example Usage of Flow Tester Agent

## How to Use the Flow Tester Agent

### 1. Basic Usage
```
You: "Please analyze the employee onboarding flow for potential breakpoints. The flow consists of: Welcome → Personal Info → Emergency Contacts → I-9 Form → W-4 Form → Document Upload → Final Review → Submit"

Agent: [Provides comprehensive analysis following the format]
```

### 2. Specific Component Testing
```
You: "Test the I-9 form component for breakpoints, especially focusing on date input, citizenship status selection, and PDF generation"

Agent: [Analyzes specific component with detailed scenarios]
```

### 3. Integration with Claude's New Features

With Claude's new agent capabilities, you can enhance this by:

1. **Computer Use**: Agent can actually interact with your application
2. **Multi-step Reasoning**: Agent can follow complex user journeys
3. **Context Awareness**: Agent remembers previous issues found

## Enhanced Agent Prompt for Claude's Latest Capabilities

```markdown
You are a Flow Testing Agent with the ability to:
1. Interact with web applications directly
2. Execute multi-step test scenarios
3. Take screenshots of issues found
4. Generate detailed reports with visual evidence

When testing, you should:
1. Actually navigate through the application
2. Try to break each step systematically
3. Document with screenshots
4. Provide exact reproduction steps
5. Test across different viewport sizes
```

## Sample Test Scenarios for Your Onboarding System

### Scenario 1: Interrupted Employee
```
1. Start onboarding process
2. Complete 50% of forms
3. Close browser without saving
4. Return 2 hours later
5. Expected: Progress saved
6. Test: Does it actually work?
```

### Scenario 2: Manager-Employee Race Condition
```
1. Manager starts employee setup
2. Employee receives link and starts
3. Manager makes changes while employee is filling forms
4. Test: Data consistency issues?
```

### Scenario 3: Multi-Language Chaos
```
1. Start in English
2. Switch to Spanish mid-form
3. Submit some data
4. Switch back to English
5. Test: Are translations consistent? Data preserved?
```

## Integration with Your Development Workflow

1. **Pre-Deployment Testing**
   ```bash
   # Run agent on staging environment
   claude-agent test --flow "onboarding" --environment "staging"
   ```

2. **Continuous Integration**
   - Add agent tests to CI/CD pipeline
   - Run on every PR
   - Block merges if critical breakpoints found

3. **Regular Audits**
   - Weekly full flow analysis
   - Monthly security-focused testing
   - Quarterly accessibility review

## Metrics to Track

1. **Breakpoint Discovery Rate**
   - New issues found per test run
   - Severity distribution

2. **Fix Verification**
   - Breakpoints successfully resolved
   - Regression rate

3. **User Impact Score**
   - Potential users affected
   - Business impact assessment
```