# Security Incident Response Plan

## Executive Summary

This document outlines the comprehensive incident response procedures for the Scrum Board application. It provides structured protocols for detecting, responding to, and recovering from security incidents to minimize impact and ensure business continuity.

## Table of Contents

1. [Incident Response Team](#incident-response-team)
2. [Incident Classification](#incident-classification)
3. [Response Procedures](#response-procedures)
4. [Communication Protocols](#communication-protocols)
5. [Technical Response Playbooks](#technical-response-playbooks)
6. [Evidence Collection](#evidence-collection)
7. [Recovery Procedures](#recovery-procedures)
8. [Post-Incident Activities](#post-incident-activities)
9. [Legal and Compliance](#legal-and-compliance)
10. [Testing and Exercises](#testing-and-exercises)

## Incident Response Team

### 1.1 Team Structure

#### Incident Commander (IC)
- **Primary**: Security Team Lead
- **Backup**: DevOps Manager
- **Responsibilities**:
  - Overall incident coordination
  - Decision-making authority
  - External communication approval
  - Resource allocation

#### Security Analyst
- **Primary**: Senior Security Engineer
- **Backup**: Security Consultant
- **Responsibilities**:
  - Threat analysis and assessment
  - Security tool management
  - Forensic evidence collection
  - Attack vector analysis

#### Technical Lead
- **Primary**: Lead Developer
- **Backup**: Senior DevOps Engineer
- **Responsibilities**:
  - System containment and isolation
  - Technical remediation
  - Service restoration
  - Code analysis and patching

#### Communications Coordinator
- **Primary**: Product Manager
- **Backup**: Customer Success Manager
- **Responsibilities**:
  - Internal stakeholder updates
  - Customer communication
  - Media relations (if required)
  - Status page management

#### Legal Counsel
- **Primary**: Legal Team
- **Backup**: External Legal Counsel
- **Responsibilities**:
  - Regulatory compliance
  - Legal implications assessment
  - Law enforcement coordination
  - Contract and liability review

### 1.2 Contact Information

```yaml
# Emergency Contact List
incident_commander:
  primary:
    name: "Security Team Lead"
    phone: "+1-XXX-XXX-XXXX"
    email: "security-lead@company.com"
    slack: "@security-lead"
  backup:
    name: "DevOps Manager"
    phone: "+1-XXX-XXX-XXXX"
    email: "devops-manager@company.com"
    slack: "@devops-manager"

security_analyst:
  primary:
    name: "Senior Security Engineer"
    phone: "+1-XXX-XXX-XXXX"
    email: "security-engineer@company.com"
    slack: "@sec-engineer"

# 24/7 Security Operations Center
soc:
  phone: "+1-XXX-XXX-XXXX"
  email: "soc@company.com"
  slack: "#security-alerts"

# External Resources
external_forensics:
  name: "Digital Forensics Inc."
  phone: "+1-XXX-XXX-XXXX"
  email: "emergency@digitalforensics.com"

legal_counsel:
  name: "Legal Firm"
  phone: "+1-XXX-XXX-XXXX"
  email: "emergency@legalfirm.com"
```

## Incident Classification

### 2.1 Severity Levels

#### Critical (P0) - Response Time: 15 minutes
**Criteria**:
- Active data breach with confirmed data exfiltration
- Complete system compromise
- Ransomware infection
- Public disclosure of sensitive data
- Regulatory violations with legal implications

**Examples**:
- Database with customer data compromised
- Administrative accounts taken over
- Production systems encrypted by ransomware
- Customer payment information exposed

#### High (P1) - Response Time: 1 hour
**Criteria**:
- Attempted unauthorized access to sensitive systems
- Suspicious activity indicating potential breach
- Service disruption affecting multiple customers
- Malware detection on production systems

**Examples**:
- Failed login attempts from unusual locations
- Unusual data access patterns
- API abuse or scraping attempts
- Insider threat indicators

#### Medium (P2) - Response Time: 4 hours
**Criteria**:
- Security policy violations
- Non-critical vulnerabilities
- Suspicious but contained activities
- Minor service disruptions

**Examples**:
- Employee policy violations
- Vulnerability scan alerts
- Phishing email reports
- Minor configuration issues

#### Low (P3) - Response Time: 24 hours
**Criteria**:
- General security concerns
- Informational security events
- Routine security maintenance
- Training-related incidents

**Examples**:
- Security awareness incidents
- Routine patch notifications
- General security questions
- Compliance documentation updates

### 2.2 Incident Types

```yaml
incident_types:
  data_breach:
    description: "Unauthorized access to sensitive data"
    priority: "Critical"
    escalation: "Immediate"
    
  malware_infection:
    description: "Malicious software detected"
    priority: "High"
    escalation: "1 hour"
    
  ddos_attack:
    description: "Distributed denial of service"
    priority: "High"
    escalation: "30 minutes"
    
  insider_threat:
    description: "Malicious or negligent employee activity"
    priority: "High"
    escalation: "2 hours"
    
  phishing_attack:
    description: "Social engineering attempt"
    priority: "Medium"
    escalation: "4 hours"
    
  vulnerability_exploit:
    description: "Known vulnerability being exploited"
    priority: "High"
    escalation: "1 hour"
    
  account_compromise:
    description: "User account taken over"
    priority: "High"
    escalation: "1 hour"
    
  policy_violation:
    description: "Security policy not followed"
    priority: "Medium"
    escalation: "8 hours"
```

## Response Procedures

### 3.1 Initial Response (OODA Loop)

#### Observe (0-15 minutes)
1. **Detect and Alert**
   ```bash
   # Automated monitoring alerts
   # Manual reports from users/staff
   # External notifications (customers, partners)
   ```

2. **Initial Assessment**
   - Verify the incident is genuine
   - Determine initial scope and impact
   - Classify incident severity
   - Identify affected systems and data

3. **Team Activation**
   ```bash
   # Activate incident response team
   # Establish communication channels
   # Set up incident war room (physical/virtual)
   # Begin timeline documentation
   ```

#### Orient (15-30 minutes)
1. **Situation Analysis**
   - Gather additional information
   - Assess threat actor capabilities
   - Determine attack vectors
   - Evaluate business impact

2. **Resource Assessment**
   - Available technical resources
   - Required external assistance
   - Legal and compliance requirements
   - Communication needs

#### Decide (30-45 minutes)
1. **Response Strategy**
   - Containment approach
   - Eradication methods
   - Recovery timeline
   - Communication plan

2. **Action Planning**
   - Immediate actions (containment)
   - Short-term actions (investigation)
   - Long-term actions (recovery)
   - Resource allocation

#### Act (45+ minutes)
1. **Execute Response Plan**
   - Implement containment measures
   - Begin investigation
   - Start recovery procedures
   - Communicate with stakeholders

### 3.2 Detailed Response Phases

#### Phase 1: Preparation (Ongoing)
- Maintain incident response capabilities
- Regular team training and exercises
- Tool and process updates
- Threat intelligence monitoring

#### Phase 2: Identification (0-15 minutes)
```bash
#!/bin/bash
# Incident Identification Checklist

# 1. Verify incident authenticity
echo "Verifying incident reports..."

# 2. Initial impact assessment
echo "Assessing initial impact..."

# 3. Classify incident severity
echo "Classifying incident severity..."

# 4. Activate response team
echo "Activating incident response team..."

# 5. Establish communication
echo "Setting up incident communication channels..."
```

#### Phase 3: Containment (15-60 minutes)
```bash
#!/bin/bash
# Containment Procedures

# Short-term containment
echo "Implementing short-term containment..."
# - Isolate affected systems
# - Block malicious IP addresses
# - Disable compromised accounts
# - Preserve evidence

# Long-term containment  
echo "Implementing long-term containment..."
# - Apply security patches
# - Implement additional monitoring
# - Deploy compensating controls
# - Update security configurations
```

#### Phase 4: Eradication (1-24 hours)
```bash
#!/bin/bash
# Eradication Procedures

# Remove threat from environment
echo "Removing threats from environment..."
# - Delete malware
# - Remove unauthorized access
# - Close attack vectors
# - Update security controls

# Vulnerability remediation
echo "Remediating vulnerabilities..."
# - Patch systems
# - Update configurations
# - Implement additional controls
# - Validate remediation
```

#### Phase 5: Recovery (1-72 hours)
```bash
#!/bin/bash
# Recovery Procedures

# Restore systems and services
echo "Restoring systems and services..."
# - Restore from clean backups
# - Rebuild compromised systems
# - Implement additional monitoring
# - Gradually restore service

# Validation and monitoring
echo "Validating recovery..."
# - Test system functionality
# - Monitor for continued threats
# - Verify data integrity
# - Confirm security posture
```

#### Phase 6: Lessons Learned (Within 30 days)
- Conduct post-incident review
- Document lessons learned
- Update procedures and controls
- Provide additional training

## Communication Protocols

### 4.1 Internal Communication

#### Incident Declaration
```yaml
incident_declaration:
  channels:
    - "#security-incidents" (Slack)
    - "incidents@company.com" (Email)
    - "Security Team" (Phone/SMS)
  
  template: |
    🚨 SECURITY INCIDENT DECLARED
    
    Incident ID: INC-{{timestamp}}
    Severity: {{severity}}
    Type: {{incident_type}}
    Detected: {{detection_time}}
    
    Initial Assessment:
    - Affected Systems: {{affected_systems}}
    - Potential Impact: {{impact}}
    - Current Status: {{status}}
    
    Incident Commander: {{ic_name}}
    Response Team: {{team_members}}
    
    Next Update: {{next_update_time}}
```

#### Status Updates
```yaml
status_update:
  frequency:
    critical: "Every 30 minutes"
    high: "Every 2 hours"
    medium: "Every 8 hours"
    low: "Daily"
  
  template: |
    📊 INCIDENT STATUS UPDATE
    
    Incident ID: {{incident_id}}
    Time: {{update_time}}
    Status: {{current_status}}
    
    Progress Since Last Update:
    {{progress_summary}}
    
    Current Actions:
    {{current_actions}}
    
    Next Steps:
    {{next_steps}}
    
    Estimated Resolution: {{eta}}
    Next Update: {{next_update_time}}
```

### 4.2 External Communication

#### Customer Notification
```yaml
customer_notification:
  triggers:
    - "Service disruption > 1 hour"
    - "Data potentially compromised"
    - "Privacy breach confirmed"
  
  channels:
    - "Status page"
    - "Email notification"
    - "In-app messaging"
  
  template: |
    Subject: Important Security Update - {{incident_date}}
    
    Dear {{customer_name}},
    
    We are writing to inform you of a security incident that may affect your account.
    
    What Happened:
    {{incident_description}}
    
    What Information Was Involved:
    {{affected_data}}
    
    What We Are Doing:
    {{remediation_actions}}
    
    What You Should Do:
    {{customer_actions}}
    
    Contact Information:
    {{support_contact}}
    
    We sincerely apologize for any inconvenience.
    
    {{company_name}} Security Team
```

#### Regulatory Notification
```yaml
regulatory_notification:
  triggers:
    - "Personal data breach (GDPR)"
    - "Financial data breach (PCI DSS)"
    - "Healthcare data breach (HIPAA)"
  
  timeline:
    gdpr: "72 hours"
    pci_dss: "Immediately"
    hipaa: "60 days"
  
  requirements:
    - "Nature of the breach"
    - "Categories and number of affected individuals"
    - "Likely consequences"
    - "Measures taken or proposed"
```

## Technical Response Playbooks

### 5.1 Data Breach Response

```bash
#!/bin/bash
# Data Breach Response Playbook

set -euo pipefail

echo "🚨 EXECUTING DATA BREACH RESPONSE PLAYBOOK"
echo "Timestamp: $(date -u)"
echo "Incident ID: ${INCIDENT_ID:-$(uuidgen)}"

# Phase 1: Immediate Containment (0-15 minutes)
echo "📋 Phase 1: Immediate Containment"

# 1.1 Isolate affected systems
echo "Isolating affected systems..."
# - Block network access to compromised servers
# - Disable database connections
# - Suspend API access
iptables -A INPUT -s ${COMPROMISED_IP} -j DROP
systemctl stop application-service

# 1.2 Preserve evidence
echo "Preserving evidence..."
# - Create disk images
# - Capture memory dumps
# - Save log files
dd if=/dev/sda of=/evidence/disk-image-$(date +%Y%m%d-%H%M%S).img
memdump > /evidence/memory-dump-$(date +%Y%m%d-%H%M%S).mem
cp /var/log/* /evidence/logs/

# 1.3 Notify key stakeholders
echo "Notifying stakeholders..."
curl -X POST "${SLACK_WEBHOOK}" \
  -H 'Content-type: application/json' \
  --data '{"text":"🚨 Data Breach Detected - Incident ID: '${INCIDENT_ID}'"}'

# Phase 2: Assessment (15-60 minutes)
echo "📋 Phase 2: Assessment"

# 2.1 Determine scope of breach
echo "Determining breach scope..."
# - Identify affected databases
# - Count affected records
# - Classify data types
psql -c "SELECT COUNT(*) FROM users WHERE last_access BETWEEN '${BREACH_START}' AND '${BREACH_END}';"

# 2.2 Analyze attack vector
echo "Analyzing attack vector..."
# - Review access logs
# - Check for malware
# - Identify vulnerability exploited
grep -i "${ATTACKER_IP}" /var/log/nginx/access.log
clamscan -r /var/www/

# 2.3 Document findings
echo "Documenting findings..."
cat > /evidence/initial-assessment.txt << EOF
Incident ID: ${INCIDENT_ID}
Detection Time: $(date -u)
Affected Systems: ${AFFECTED_SYSTEMS}
Estimated Impact: ${IMPACT_ASSESSMENT}
Attack Vector: ${ATTACK_VECTOR}
EOF

# Phase 3: Containment (1-4 hours)
echo "📋 Phase 3: Enhanced Containment"

# 3.1 Implement additional security controls
echo "Implementing additional security controls..."
# - Deploy WAF rules
# - Update firewall configurations
# - Enable enhanced monitoring
aws wafv2 update-web-acl --scope CLOUDFRONT --id ${WAF_ID} --rules file://emergency-rules.json

# 3.2 Reset compromised credentials
echo "Resetting compromised credentials..."
# - Force password resets
# - Revoke API keys
# - Regenerate tokens
psql -c "UPDATE users SET password_reset_required = true WHERE id IN (${AFFECTED_USER_IDS});"

# Phase 4: Customer Notification (Within 24 hours)
echo "📋 Phase 4: Customer Notification"

# 4.1 Prepare notification content
echo "Preparing customer notifications..."
# - Draft notification email
# - Update status page
# - Prepare FAQ

# 4.2 Execute notification plan
echo "Executing notification plan..."
# - Send email notifications
# - Post status updates
# - Monitor customer inquiries

echo "✅ Data Breach Response Playbook Completed"
echo "Next Steps: Continue monitoring and prepare detailed incident report"
```

### 5.2 Malware Infection Response

```bash
#!/bin/bash
# Malware Infection Response Playbook

set -euo pipefail

echo "🦠 EXECUTING MALWARE INFECTION RESPONSE PLAYBOOK"
echo "Timestamp: $(date -u)"
echo "Incident ID: ${INCIDENT_ID:-$(uuidgen)}"

# Phase 1: Immediate Isolation (0-5 minutes)
echo "📋 Phase 1: Immediate Isolation"

# 1.1 Isolate infected systems
echo "Isolating infected systems..."
# - Disconnect from network
# - Preserve running state
# - Document current processes
ifconfig eth0 down
ps aux > /tmp/running-processes.txt
netstat -an > /tmp/network-connections.txt

# 1.2 Alert security team
echo "Alerting security team..."
curl -X POST "${SECURITY_WEBHOOK}" \
  -H 'Content-type: application/json' \
  --data '{"text":"🦠 Malware Detected - System: '$(hostname)' - Incident: '${INCIDENT_ID}'"}'

# Phase 2: Analysis (5-30 minutes)
echo "📋 Phase 2: Malware Analysis"

# 2.1 Identify malware type
echo "Identifying malware type..."
# - Run antivirus scan
# - Check file hashes
# - Analyze suspicious processes
clamscan -r / --log=/tmp/clamscan.log
find / -type f -newermt "$(date -d '1 hour ago')" -exec sha256sum {} \; > /tmp/recent-files.txt

# 2.2 Determine infection vector
echo "Determining infection vector..."
# - Check email attachments
# - Review web browsing history
# - Analyze network traffic
grep -i "malware\|virus\|trojan" /var/log/syslog

# 2.3 Assess impact
echo "Assessing impact..."
# - Check for data exfiltration
# - Verify system integrity
# - Review user activities
tripwire --check > /tmp/integrity-check.txt

# Phase 3: Eradication (30 minutes - 2 hours)
echo "📋 Phase 3: Malware Eradication"

# 3.1 Remove malware
echo "Removing malware..."
# - Quarantine infected files
# - Kill malicious processes
# - Remove persistence mechanisms
kill -9 ${MALICIOUS_PID}
rm -f ${MALWARE_FILES}
chkconfig malicious-service off

# 3.2 Clean and rebuild
echo "Cleaning and rebuilding..."
# - Format and reinstall if necessary
# - Restore from clean backups
# - Apply latest patches
if [ "${CLEAN_REBUILD}" = "true" ]; then
    echo "Initiating clean rebuild..."
    # Backup critical data
    # Format system
    # Restore from clean image
fi

# Phase 4: Recovery (2-8 hours)
echo "📋 Phase 4: System Recovery"

# 4.1 Restore services
echo "Restoring services..."
# - Restore from clean backups
# - Test system functionality
# - Monitor for reinfection
systemctl start application-service
curl -f http://localhost/health || echo "Service health check failed"

# 4.2 Enhanced monitoring
echo "Enabling enhanced monitoring..."
# - Deploy additional monitoring
# - Set up alerting
# - Schedule regular scans
echo "0 */4 * * * clamscan -r /" | crontab -

echo "✅ Malware Infection Response Playbook Completed"
echo "System Status: $(systemctl is-active application-service)"
```

### 5.3 DDoS Attack Response

```bash
#!/bin/bash
# DDoS Attack Response Playbook

set -euo pipefail

echo "🌊 EXECUTING DDOS ATTACK RESPONSE PLAYBOOK"
echo "Timestamp: $(date -u)"
echo "Incident ID: ${INCIDENT_ID:-$(uuidgen)}"

# Phase 1: Traffic Analysis (0-5 minutes)
echo "📋 Phase 1: Traffic Analysis"

# 1.1 Analyze current traffic
echo "Analyzing current traffic patterns..."
# - Check connection counts
# - Identify source IPs
# - Analyze request patterns
netstat -an | grep :80 | wc -l
netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -n

# 1.2 Determine attack type
echo "Determining attack type..."
# - Volume-based (UDP flood, ICMP flood)
# - Protocol-based (SYN flood, fragmented packet attacks)
# - Application-based (HTTP flood, Slowloris)
tcpdump -i eth0 -c 1000 > /tmp/traffic-sample.pcap

# Phase 2: Immediate Mitigation (5-15 minutes)
echo "📋 Phase 2: Immediate Mitigation"

# 2.1 Activate DDoS protection
echo "Activating DDoS protection..."
# - Enable rate limiting
# - Block obvious attack IPs
# - Activate CDN DDoS protection
iptables -A INPUT -p tcp --dport 80 -m limit --limit 25/minute --limit-burst 100 -j ACCEPT
for ip in ${ATTACK_IPS}; do
    iptables -A INPUT -s $ip -j DROP
done

# 2.2 Scale infrastructure
echo "Scaling infrastructure..."
# - Auto-scale web servers
# - Increase database connections
# - Enable caching
aws autoscaling set-desired-capacity --auto-scaling-group-name ${ASG_NAME} --desired-capacity 10

# Phase 3: Advanced Mitigation (15-60 minutes)
echo "📋 Phase 3: Advanced Mitigation"

# 3.1 Deploy advanced filtering
echo "Deploying advanced filtering..."
# - Geographic blocking
# - Behavioral analysis
# - CAPTCHA challenges
aws wafv2 update-web-acl --scope CLOUDFRONT --id ${WAF_ID} --rules file://ddos-rules.json

# 3.2 Contact upstream providers
echo "Contacting upstream providers..."
# - ISP DDoS mitigation
# - CDN provider assistance
# - Law enforcement (if applicable)

# Phase 4: Monitoring and Recovery (1+ hours)
echo "📋 Phase 4: Monitoring and Recovery"

# 4.1 Monitor effectiveness
echo "Monitoring mitigation effectiveness..."
# - Track blocked requests
# - Monitor server performance
# - Verify service availability
while true; do
    response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost/health)
    echo "Response time: ${response_time}s"
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        echo "Service responding normally"
        break
    fi
    sleep 30
done

# 4.2 Gradual service restoration
echo "Gradually restoring full service..."
# - Remove temporary restrictions
# - Scale down infrastructure
# - Document attack patterns

echo "✅ DDoS Attack Response Playbook Completed"
echo "Service Status: Normal operations restored"
```

### 5.4 Account Compromise Response

```bash
#!/bin/bash
# Account Compromise Response Playbook

set -euo pipefail

echo "👤 EXECUTING ACCOUNT COMPROMISE RESPONSE PLAYBOOK"
echo "Timestamp: $(date -u)"
echo "Incident ID: ${INCIDENT_ID:-$(uuidgen)}"
echo "Compromised Account: ${COMPROMISED_ACCOUNT}"

# Phase 1: Account Lockdown (0-5 minutes)
echo "📋 Phase 1: Account Lockdown"

# 1.1 Disable compromised account
echo "Disabling compromised account..."
# - Lock user account
# - Revoke active sessions
# - Disable API access
psql -c "UPDATE users SET account_locked = true, locked_at = NOW() WHERE email = '${COMPROMISED_ACCOUNT}';"
redis-cli DEL "session:user:${USER_ID}:*"
psql -c "UPDATE api_keys SET revoked = true WHERE user_id = '${USER_ID}';"

# 1.2 Alert account owner
echo "Alerting account owner..."
# - Send security alert email
# - SMS notification (if available)
# - In-app notification
curl -X POST "${EMAIL_API}" \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "'${COMPROMISED_ACCOUNT}'",
    "subject": "Security Alert: Account Compromised",
    "body": "Your account has been temporarily locked due to suspicious activity."
  }'

# Phase 2: Investigation (5-30 minutes)
echo "📋 Phase 2: Investigation"

# 2.1 Analyze account activity
echo "Analyzing account activity..."
# - Review login history
# - Check access patterns
# - Identify unauthorized actions
psql -c "SELECT * FROM user_sessions WHERE user_id = '${USER_ID}' ORDER BY created_at DESC LIMIT 50;" > /tmp/login-history.txt
psql -c "SELECT * FROM audit_logs WHERE user_id = '${USER_ID}' AND created_at > NOW() - INTERVAL '24 hours';" > /tmp/recent-activity.txt

# 2.2 Determine compromise method
echo "Determining compromise method..."
# - Password attack (brute force, credential stuffing)
# - Phishing attack
# - Malware/keylogger
# - Social engineering
grep "failed_login" /var/log/auth.log | grep "${COMPROMISED_ACCOUNT}" | tail -20

# 2.3 Assess impact
echo "Assessing impact..."
# - Data accessed
# - Changes made
# - Other accounts affected
psql -c "SELECT COUNT(*) FROM stories WHERE created_by = '${USER_ID}' AND created_at > '${COMPROMISE_TIME}';" > /tmp/impact-assessment.txt

# Phase 3: Containment (30 minutes - 2 hours)
echo "📋 Phase 3: Containment"

# 3.1 Review and revert unauthorized changes
echo "Reviewing and reverting unauthorized changes..."
# - Identify unauthorized data changes
# - Revert malicious modifications
# - Restore deleted data
psql -c "SELECT * FROM stories WHERE updated_by = '${USER_ID}' AND updated_at > '${COMPROMISE_TIME}';" > /tmp/unauthorized-changes.txt

# 3.2 Check for lateral movement
echo "Checking for lateral movement..."
# - Review access to other accounts
# - Check privilege escalation attempts
# - Analyze network connections
psql -c "SELECT DISTINCT ip_address FROM user_sessions WHERE user_id = '${USER_ID}' AND created_at > '${COMPROMISE_TIME}';" > /tmp/access-ips.txt

# Phase 4: Recovery (2-24 hours)
echo "📋 Phase 4: Account Recovery"

# 4.1 Secure account recovery process
echo "Initiating secure account recovery..."
# - Verify account owner identity
# - Force password reset
# - Enable MFA (if not already enabled)
# - Generate new API keys
psql -c "UPDATE users SET password_reset_required = true, mfa_required = true WHERE id = '${USER_ID}';"

# 4.2 Enhanced monitoring
echo "Enabling enhanced monitoring..."
# - Monitor for recompromise attempts
# - Flag unusual activities
# - Regular security check-ins
psql -c "INSERT INTO security_flags (user_id, flag_type, description, expires_at) VALUES ('${USER_ID}', 'enhanced_monitoring', 'Account recently compromised', NOW() + INTERVAL '30 days');"

# 4.3 User education
echo "Preparing user education materials..."
# - Security best practices
# - Password hygiene
# - Phishing awareness
# - MFA setup guidance

echo "✅ Account Compromise Response Playbook Completed"
echo "Account Status: Secured and monitoring enabled"
```

## Evidence Collection

### 6.1 Digital Forensics Procedures

```bash
#!/bin/bash
# Digital Evidence Collection Script

set -euo pipefail

EVIDENCE_DIR="/evidence/$(date +%Y%m%d-%H%M%S)"
INCIDENT_ID="${1:-$(uuidgen)}"

echo "🔍 DIGITAL EVIDENCE COLLECTION"
echo "Incident ID: ${INCIDENT_ID}"
echo "Evidence Directory: ${EVIDENCE_DIR}"

# Create evidence directory with proper permissions
mkdir -p "${EVIDENCE_DIR}"
chmod 700 "${EVIDENCE_DIR}"

# Phase 1: System State Capture
echo "📋 Phase 1: System State Capture"

# 1.1 Memory dump
echo "Creating memory dump..."
if command -v memdump &> /dev/null; then
    memdump > "${EVIDENCE_DIR}/memory-dump.mem"
    sha256sum "${EVIDENCE_DIR}/memory-dump.mem" > "${EVIDENCE_DIR}/memory-dump.sha256"
fi

# 1.2 Running processes
echo "Capturing running processes..."
ps auxwww > "${EVIDENCE_DIR}/running-processes.txt"
lsof > "${EVIDENCE_DIR}/open-files.txt"
netstat -anp > "${EVIDENCE_DIR}/network-connections.txt"

# 1.3 System information
echo "Collecting system information..."
uname -a > "${EVIDENCE_DIR}/system-info.txt"
uptime > "${EVIDENCE_DIR}/uptime.txt"
who > "${EVIDENCE_DIR}/logged-users.txt"
last -n 50 > "${EVIDENCE_DIR}/login-history.txt"

# Phase 2: File System Analysis
echo "📋 Phase 2: File System Analysis"

# 2.1 Recently modified files
echo "Finding recently modified files..."
find / -type f -mtime -1 -ls 2>/dev/null > "${EVIDENCE_DIR}/recent-files.txt"
find / -type f -atime -1 -ls 2>/dev/null > "${EVIDENCE_DIR}/recent-access.txt"

# 2.2 Suspicious files and directories
echo "Searching for suspicious files..."
find / -name "*.tmp" -o -name ".*" -type f 2>/dev/null > "${EVIDENCE_DIR}/suspicious-files.txt"
find /tmp /var/tmp -type f -ls > "${EVIDENCE_DIR}/temp-files.txt"

# 2.3 File integrity checking
echo "Checking file integrity..."
if command -v tripwire &> /dev/null; then
    tripwire --check > "${EVIDENCE_DIR}/integrity-check.txt" 2>&1
fi

# Phase 3: Log Collection
echo "📋 Phase 3: Log Collection"

# 3.1 System logs
echo "Collecting system logs..."
cp -r /var/log "${EVIDENCE_DIR}/system-logs/"
chmod -R 600 "${EVIDENCE_DIR}/system-logs/"

# 3.2 Application logs
echo "Collecting application logs..."
if [ -d "/var/log/nginx" ]; then
    cp -r /var/log/nginx "${EVIDENCE_DIR}/nginx-logs/"
fi
if [ -d "/var/log/postgresql" ]; then
    cp -r /var/log/postgresql "${EVIDENCE_DIR}/postgresql-logs/"
fi

# 3.3 Security logs
echo "Collecting security logs..."
if [ -f "/var/log/auth.log" ]; then
    cp /var/log/auth.log "${EVIDENCE_DIR}/auth.log"
fi
if [ -f "/var/log/secure" ]; then
    cp /var/log/secure "${EVIDENCE_DIR}/secure.log"
fi

# Phase 4: Network Evidence
echo "📋 Phase 4: Network Evidence"

# 4.1 Network configuration
echo "Capturing network configuration..."
ifconfig > "${EVIDENCE_DIR}/network-config.txt"
route -n > "${EVIDENCE_DIR}/routing-table.txt"
iptables -L -n -v > "${EVIDENCE_DIR}/firewall-rules.txt"

# 4.2 Active connections
echo "Capturing active connections..."
ss -tuln > "${EVIDENCE_DIR}/listening-ports.txt"
ss -tulpn > "${EVIDENCE_DIR}/active-connections.txt"

# Phase 5: Database Evidence
echo "📋 Phase 5: Database Evidence"

# 5.1 Recent database activity
echo "Collecting database evidence..."
if command -v psql &> /dev/null; then
    psql -c "SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;" > "${EVIDENCE_DIR}/database-audit.txt" 2>/dev/null || true
    psql -c "SELECT * FROM user_sessions WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;" > "${EVIDENCE_DIR}/user-sessions.txt" 2>/dev/null || true
fi

# Phase 6: Evidence Integrity
echo "📋 Phase 6: Evidence Integrity"

# 6.1 Calculate checksums
echo "Calculating evidence checksums..."
find "${EVIDENCE_DIR}" -type f -exec sha256sum {} \; > "${EVIDENCE_DIR}/checksums.sha256"

# 6.2 Create evidence manifest
echo "Creating evidence manifest..."
cat > "${EVIDENCE_DIR}/evidence-manifest.txt" << EOF
Incident ID: ${INCIDENT_ID}
Collection Date: $(date -u)
Collector: $(whoami)
System: $(hostname)
Evidence Location: ${EVIDENCE_DIR}

Evidence Items:
$(find "${EVIDENCE_DIR}" -type f | wc -l) files collected
Total Size: $(du -sh "${EVIDENCE_DIR}" | cut -f1)

Collection Completed: $(date -u)
EOF

# 6.3 Sign evidence
echo "Signing evidence package..."
if command -v gpg &> /dev/null; then
    gpg --armor --detach-sign "${EVIDENCE_DIR}/checksums.sha256"
fi

# 6.4 Archive evidence
echo "Archiving evidence..."
tar -czf "${EVIDENCE_DIR}.tar.gz" -C "$(dirname "${EVIDENCE_DIR}")" "$(basename "${EVIDENCE_DIR}")"
sha256sum "${EVIDENCE_DIR}.tar.gz" > "${EVIDENCE_DIR}.tar.gz.sha256"

echo "✅ Evidence collection completed"
echo "Evidence archive: ${EVIDENCE_DIR}.tar.gz"
echo "Archive checksum: $(cat "${EVIDENCE_DIR}.tar.gz.sha256")"
```

### 6.2 Chain of Custody

```yaml
chain_of_custody:
  evidence_id: "{{evidence_id}}"
  incident_id: "{{incident_id}}"
  
  collection:
    date: "{{collection_date}}"
    time: "{{collection_time}}"
    collector: "{{collector_name}}"
    location: "{{collection_location}}"
    method: "{{collection_method}}"
    tools_used: "{{tools_list}}"
    
  custody_log:
    - timestamp: "{{transfer_time}}"
      from: "{{previous_custodian}}"
      to: "{{new_custodian}}"
      purpose: "{{transfer_purpose}}"
      signature: "{{custodian_signature}}"
      
  integrity_verification:
    initial_hash: "{{initial_checksum}}"
    verification_dates:
      - date: "{{verification_date}}"
        hash: "{{verification_hash}}"
        verifier: "{{verifier_name}}"
        status: "{{integrity_status}}"
```

## Recovery Procedures

### 7.1 System Recovery Checklist

```yaml
system_recovery:
  preparation:
    - "Verify threat elimination"
    - "Confirm system integrity"
    - "Test backup validity"
    - "Prepare rollback plan"
    
  restoration:
    - "Restore from clean backups"
    - "Apply security patches"
    - "Update configurations"
    - "Regenerate credentials"
    
  validation:
    - "Test system functionality"
    - "Verify security controls"
    - "Confirm data integrity"
    - "Monitor for anomalies"
    
  monitoring:
    - "Enhanced logging"
    - "Increased alerting"
    - "Regular health checks"
    - "Performance monitoring"
```

### 7.2 Business Continuity

```bash
#!/bin/bash
# Business Continuity Recovery Script

set -euo pipefail

echo "🔄 BUSINESS CONTINUITY RECOVERY"
echo "Timestamp: $(date -u)"
echo "Recovery Objective: ${RTO:-4h}"
echo "Data Objective: ${RPO:-1h}"

# Phase 1: Assess Recovery Requirements
echo "📋 Phase 1: Recovery Assessment"

# 1.1 Determine recovery scope
echo "Determining recovery scope..."
# - Critical systems identification
# - Data recovery requirements
# - Service prioritization

# 1.2 Validate backup integrity
echo "Validating backup integrity..."
# - Check backup checksums
# - Test backup restoration
# - Verify data completeness

# Phase 2: Infrastructure Recovery
echo "📋 Phase 2: Infrastructure Recovery"

# 2.1 Restore core infrastructure
echo "Restoring core infrastructure..."
# - Database servers
# - Application servers
# - Load balancers
# - Monitoring systems

# 2.2 Network and security
echo "Restoring network and security..."
# - Firewall configurations
# - VPN connections
# - Security monitoring
# - Access controls

# Phase 3: Application Recovery
echo "📋 Phase 3: Application Recovery"

# 3.1 Restore application services
echo "Restoring application services..."
# - Web applications
# - API services
# - Background jobs
# - Integration services

# 3.2 Data validation
echo "Validating restored data..."
# - Data integrity checks
# - Consistency verification
# - Business logic validation
# - User access testing

# Phase 4: Service Validation
echo "📋 Phase 4: Service Validation"

# 4.1 Functional testing
echo "Performing functional testing..."
# - Core functionality
# - User workflows
# - Integration points
# - Performance testing

# 4.2 Security validation
echo "Performing security validation..."
# - Authentication testing
# - Authorization verification
# - Security control validation
# - Vulnerability scanning

echo "✅ Business Continuity Recovery Completed"
echo "Service Status: $(systemctl is-active application-service)"
echo "Recovery Time: $(($(date +%s) - ${RECOVERY_START_TIME})) seconds"
```

## Post-Incident Activities

### 8.1 Lessons Learned Process

```yaml
lessons_learned:
  timeline:
    initial_review: "Within 24 hours"
    detailed_analysis: "Within 1 week"
    final_report: "Within 2 weeks"
    improvement_plan: "Within 1 month"
    
  participants:
    - "Incident Commander"
    - "Response team members"
    - "Affected business units"
    - "External partners (if involved)"
    - "Senior management"
    
  review_areas:
    - "Timeline and response effectiveness"
    - "Communication quality"
    - "Technical solutions"
    - "Process improvements"
    - "Training needs"
    
  deliverables:
    - "Incident timeline"
    - "Root cause analysis"
    - "Impact assessment"
    - "Improvement recommendations"
    - "Action plan with owners and deadlines"
```

### 8.2 Improvement Implementation

```bash
#!/bin/bash
# Post-Incident Improvement Implementation

set -euo pipefail

echo "📈 POST-INCIDENT IMPROVEMENT IMPLEMENTATION"
echo "Incident ID: ${INCIDENT_ID}"
echo "Timestamp: $(date -u)"

# Phase 1: Documentation Update
echo "📋 Phase 1: Documentation Update"

# 1.1 Update incident response procedures
echo "Updating incident response procedures..."
# - Incorporate lessons learned
# - Update contact information
# - Revise response timeframes
# - Add new playbooks

# 1.2 Update security policies
echo "Updating security policies..."
# - Revise security controls
# - Update risk assessments
# - Modify compliance procedures
# - Enhance monitoring requirements

# Phase 2: Technical Improvements
echo "📋 Phase 2: Technical Improvements"

# 2.1 Security control enhancements
echo "Implementing security control enhancements..."
# - Additional monitoring
# - Enhanced alerting
# - Improved access controls
# - Better encryption

# 2.2 Infrastructure improvements
echo "Implementing infrastructure improvements..."
# - Redundancy enhancements
# - Performance optimizations
# - Backup improvements
# - Recovery automation

# Phase 3: Process Improvements
echo "📋 Phase 3: Process Improvements"

# 3.1 Response process updates
echo "Updating response processes..."
# - Communication procedures
# - Escalation criteria
# - Decision-making processes
# - Coordination mechanisms

# 3.2 Training and awareness
echo "Implementing training improvements..."
# - Staff training updates
# - Awareness programs
# - Simulation exercises
# - Knowledge sharing

echo "✅ Post-Incident Improvements Implemented"
echo "Next Review: $(date -d '+3 months' -u)"
```

## Legal and Compliance

### 9.1 Regulatory Requirements

```yaml
regulatory_compliance:
  gdpr:
    notification_timeline: "72 hours to supervisory authority"
    individual_notification: "Without undue delay if high risk"
    requirements:
      - "Nature of breach"
      - "Categories of affected individuals"
      - "Likely consequences"
      - "Measures taken or proposed"
      
  pci_dss:
    notification_timeline: "Immediately"
    requirements:
      - "Incident details"
      - "Affected card numbers"
      - "Remediation actions"
      - "Forensic investigation"
      
  hipaa:
    notification_timeline: "60 days"
    requirements:
      - "Brief description"
      - "Types of information involved"
      - "Steps individuals should take"
      - "What organization is doing"
      
  sox:
    requirements:
      - "Material weakness disclosure"
      - "Internal control assessment"
      - "Management certification"
      - "Auditor communication"
```

### 9.2 Legal Documentation

```yaml
legal_documentation:
  incident_report:
    template: "legal/incident-report-template.docx"
    required_sections:
      - "Executive Summary"
      - "Incident Details"
      - "Impact Assessment"
      - "Response Actions"
      - "Legal Implications"
      
  preservation_notice:
    triggers:
      - "Potential litigation"
      - "Regulatory investigation"
      - "Law enforcement request"
    scope:
      - "Electronic communications"
      - "System logs"
      - "Backup data"
      - "Personnel files"
      
  disclosure_decisions:
    criteria:
      - "Legal requirements"
      - "Contractual obligations"
      - "Business impact"
      - "Stakeholder interests"
    approval_process:
      - "Legal review"
      - "Management approval"
      - "Board notification"
      - "External counsel consultation"
```

## Testing and Exercises

### 10.1 Incident Response Testing

```yaml
testing_program:
  tabletop_exercises:
    frequency: "Quarterly"
    duration: "2-4 hours"
    participants:
      - "Incident response team"
      - "Business stakeholders"
      - "External partners"
    scenarios:
      - "Data breach"
      - "Ransomware attack"
      - "DDoS attack"
      - "Insider threat"
      
  simulation_exercises:
    frequency: "Bi-annually"
    duration: "4-8 hours"
    scope:
      - "Full response team activation"
      - "Technical response procedures"
      - "Communication protocols"
      - "Recovery procedures"
      
  red_team_exercises:
    frequency: "Annually"
    duration: "1-2 weeks"
    scope:
      - "Attack simulation"
      - "Detection capabilities"
      - "Response effectiveness"
      - "Recovery procedures"
```

### 10.2 Exercise Evaluation

```bash
#!/bin/bash
# Incident Response Exercise Evaluation

set -euo pipefail

EXERCISE_ID="${1:-EX-$(date +%Y%m%d)}"
EXERCISE_TYPE="${2:-tabletop}"

echo "📊 INCIDENT RESPONSE EXERCISE EVALUATION"
echo "Exercise ID: ${EXERCISE_ID}"
echo "Exercise Type: ${EXERCISE_TYPE}"
echo "Date: $(date -u)"

# Evaluation criteria
EVAL_CRITERIA=(
    "Response Time"
    "Communication Effectiveness"
    "Technical Execution"
    "Decision Making"
    "Coordination"
    "Documentation"
)

# Collect feedback
echo "Collecting exercise feedback..."
for criteria in "${EVAL_CRITERIA[@]}"; do
    echo "Evaluating: ${criteria}"
    # Collect ratings and comments
    # Generate improvement recommendations
done

# Generate exercise report
cat > "/tmp/exercise-report-${EXERCISE_ID}.md" << EOF
# Incident Response Exercise Report

## Exercise Details
- **Exercise ID**: ${EXERCISE_ID}
- **Type**: ${EXERCISE_TYPE}
- **Date**: $(date -u)
- **Duration**: ${EXERCISE_DURATION}
- **Participants**: ${PARTICIPANT_COUNT}

## Scenario
${EXERCISE_SCENARIO}

## Performance Summary
| Criteria | Score | Comments |
|----------|-------|----------|
$(for criteria in "${EVAL_CRITERIA[@]}"; do echo "| ${criteria} | ${SCORE} | ${COMMENTS} |"; done)

## Key Findings
${KEY_FINDINGS}

## Recommendations
${RECOMMENDATIONS}

## Action Items
${ACTION_ITEMS}

## Next Exercise
Scheduled for: ${NEXT_EXERCISE_DATE}
EOF

echo "✅ Exercise evaluation completed"
echo "Report location: /tmp/exercise-report-${EXERCISE_ID}.md"
```

---

## Appendices

### Appendix A: Contact Templates

#### Emergency Contact Card
```
🚨 SECURITY INCIDENT EMERGENCY CONTACTS 🚨

Incident Commander: +1-XXX-XXX-XXXX
Security Team: +1-XXX-XXX-XXXX
Technical Lead: +1-XXX-XXX-XXXX
Legal Counsel: +1-XXX-XXX-XXXX

Slack: #security-incidents
Email: security@company.com

External Forensics: +1-XXX-XXX-XXXX
Law Enforcement: 911 / +1-XXX-XXX-XXXX
Regulatory Hotline: +1-XXX-XXX-XXXX
```

### Appendix B: Legal Templates

#### Data Breach Notification Template
```
Subject: Important Security Notice - Data Security Incident

Dear [Customer Name],

We are writing to inform you of a security incident that may have affected your personal information.

[Incident details, affected data, actions taken, customer recommendations]

We sincerely apologize for this incident and any inconvenience it may cause.

[Company Name] Security Team
[Contact Information]
```

### Appendix C: Technical Tools

#### Required Incident Response Tools
- **Forensic Imaging**: dd, dc3dd, FTK Imager
- **Memory Analysis**: Volatility, Rekall
- **Network Analysis**: Wireshark, tcpdump, nmap
- **Malware Analysis**: Cuckoo Sandbox, VirusTotal
- **Log Analysis**: ELK Stack, Splunk, Graylog
- **Communication**: Slack, Microsoft Teams, Signal

---

*Document Version: 1.0*  
*Last Updated: September 28, 2025*  
*Next Review: October 28, 2025*  
*Classification: CONFIDENTIAL*