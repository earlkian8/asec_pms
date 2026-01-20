<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Project Milestone Report - {{ $project['code'] }}</title>
    <style>
        @page {
            margin: 0.5in;
            size: letter;
        }
        
        * {
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #333;
        }
        
        .header {
            border-bottom: 2px solid #1f2937;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        
        .company-name {
            font-size: 14pt;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 3px;
        }
        
        .report-title {
            font-size: 12pt;
            font-weight: bold;
            color: #374151;
            margin-top: 5px;
        }
        
        .report-meta {
            font-size: 8pt;
            color: #6b7280;
            margin-top: 3px;
        }
        
        .project-summary {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 8px;
            margin-bottom: 10px;
        }
        
        .project-summary h3 {
            font-size: 10pt;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 6px;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 3px;
        }
        
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
        }
        
        .summary-table td {
            padding: 3px 6px;
            vertical-align: top;
        }
        
        .summary-label {
            font-weight: bold;
            color: #4b5563;
            width: 120px;
        }
        
        .summary-value {
            color: #111827;
        }
        
        .summary-stats {
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 8px;
            margin-bottom: 10px;
        }
        
        .summary-stats h3 {
            font-size: 10pt;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 6px;
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .stats-table td {
            text-align: center;
            padding: 5px;
            background-color: white;
            border: 1px solid #e5e7eb;
            width: 25%;
        }
        
        .stat-value {
            font-size: 14pt;
            font-weight: bold;
            color: #1f2937;
        }
        
        .stat-label {
            font-size: 8pt;
            color: #6b7280;
            margin-top: 3px;
        }
        
        .milestone-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 8pt;
        }
        
        .milestone-table th {
            background-color: #374151;
            color: white;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #1f2937;
            font-size: 8pt;
        }
        
        .milestone-table td {
            padding: 5px 4px;
            border: 1px solid #d1d5db;
            vertical-align: top;
            font-size: 8pt;
        }
        
        .milestone-table tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-completed {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .status-in_progress {
            background-color: #dbeafe;
            color: #1e40af;
        }
        
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .progress-bar-container {
            width: 100%;
            height: 12px;
            background-color: #e5e7eb;
            overflow: hidden;
            margin-top: 2px;
        }
        
        .progress-bar {
            height: 100%;
            background-color: #10b981;
        }
        
        .progress-text {
            font-size: 7pt;
            color: #4b5563;
            margin-top: 1px;
        }
        
        .task-section {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
        }
        
        .task-section h4 {
            font-size: 8pt;
            font-weight: bold;
            color: #374151;
            margin-bottom: 4px;
        }
        
        .task-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7pt;
            margin-top: 4px;
        }
        
        .task-table th {
            background-color: #f3f4f6;
            color: #374151;
            padding: 4px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #d1d5db;
            font-size: 7pt;
        }
        
        .task-table td {
            padding: 4px;
            border: 1px solid #e5e7eb;
            font-size: 7pt;
        }
        
        .task-table tr:nth-child(even) {
            background-color: #fafafa;
        }
        
        .sign-off-section {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #1f2937;
        }
        
        .sign-off-section h3 {
            font-size: 10pt;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .sign-off-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }
        
        .sign-off-table td {
            width: 50%;
            border: 1px solid #d1d5db;
            padding: 8px;
            vertical-align: top;
        }
        
        .sign-off-label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 25px;
            font-size: 8pt;
        }
        
        .sign-off-line {
            border-top: 1px solid #9ca3af;
            margin-top: 30px;
            padding-top: 3px;
            font-size: 8pt;
            color: #6b7280;
        }
        
        .footer {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
            font-size: 7pt;
            color: #6b7280;
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .currency {
            font-weight: bold;
            color: #059669;
        }
        
        .date {
            color: #4b5563;
        }
        
        .page-break-avoid {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <!-- Header Section -->
    <div class="header">
        <div class="company-name">Abdurauf Sawadjaan Engineering Consultancy</div>
        <div class="report-title">Project Milestone Report</div>
        <div class="report-meta">
            Generated on: {{ $generated_at->format('F d, Y \a\t g:i A') }} | 
            Report ID: {{ strtoupper(substr(md5($project['code'] . $generated_at->timestamp), 0, 8)) }}
        </div>
    </div>

    <!-- Project Summary Section -->
    <div class="project-summary">
        <h3>Project Information</h3>
        <table class="summary-table">
            <tr>
                <td class="summary-label">Project Code:</td>
                <td class="summary-value">{{ $project['code'] }}</td>
                <td class="summary-label">Project Name:</td>
                <td class="summary-value">{{ $project['name'] }}</td>
            </tr>
            @if($project['client'])
            <tr>
                <td class="summary-label">Client:</td>
                <td class="summary-value">{{ $project['client']['code'] }} - {{ $project['client']['name'] }}</td>
                @if($project['project_type'])
                <td class="summary-label">Project Type:</td>
                <td class="summary-value">{{ $project['project_type'] }}</td>
                @else
                <td colspan="2"></td>
                @endif
            </tr>
            @elseif($project['project_type'])
            <tr>
                <td class="summary-label">Project Type:</td>
                <td class="summary-value">{{ $project['project_type'] }}</td>
                <td colspan="2"></td>
            </tr>
            @endif
            <tr>
                <td class="summary-label">Status:</td>
                <td class="summary-value" style="text-transform: capitalize;">{{ str_replace('_', ' ', $project['status']) }}</td>
                <td class="summary-label">Priority:</td>
                <td class="summary-value" style="text-transform: capitalize;">{{ $project['priority'] }}</td>
            </tr>
            @if($project['contract_amount'])
            <tr>
                <td class="summary-label">Contract Amount:</td>
                <td class="summary-value currency">₱{{ number_format($project['contract_amount'], 2) }}</td>
                <td colspan="2"></td>
            </tr>
            @endif
            @if($project['start_date'])
            <tr>
                <td class="summary-label">Start Date:</td>
                <td class="summary-value date">{{ \Carbon\Carbon::parse($project['start_date'])->format('M d, Y') }}</td>
                @if($project['planned_end_date'])
                <td class="summary-label">Planned End:</td>
                <td class="summary-value date">{{ \Carbon\Carbon::parse($project['planned_end_date'])->format('M d, Y') }}</td>
                @else
                <td colspan="2"></td>
                @endif
            </tr>
            @elseif($project['planned_end_date'])
            <tr>
                <td class="summary-label">Planned End:</td>
                <td class="summary-value date">{{ \Carbon\Carbon::parse($project['planned_end_date'])->format('M d, Y') }}</td>
                <td colspan="2"></td>
            </tr>
            @endif
            @if($project['actual_end_date'])
            <tr>
                <td class="summary-label">Actual End:</td>
                <td class="summary-value date">{{ \Carbon\Carbon::parse($project['actual_end_date'])->format('M d, Y') }}</td>
                <td colspan="2"></td>
            </tr>
            @endif
            @if($project['location'])
            <tr>
                <td class="summary-label">Location:</td>
                <td class="summary-value" colspan="3">{{ $project['location'] }}</td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Summary Statistics -->
    <div class="summary-stats">
        <h3>Milestone Summary</h3>
        <table class="stats-table">
            <tr>
                <td>
                    <div class="stat-value">{{ $summary['total_milestones'] }}</div>
                    <div class="stat-label">Total</div>
                </td>
                <td>
                    <div class="stat-value" style="color: #059669;">{{ $summary['completed_milestones'] }}</div>
                    <div class="stat-label">Completed</div>
                </td>
                <td>
                    <div class="stat-value" style="color: #2563eb;">{{ $summary['in_progress_milestones'] }}</div>
                    <div class="stat-label">In Progress</div>
                </td>
                <td>
                    <div class="stat-value" style="color: #d97706;">{{ $summary['pending_milestones'] }}</div>
                    <div class="stat-label">Pending</div>
                </td>
            </tr>
        </table>
        <div style="margin-top: 8px; text-align: center;">
            <div style="font-size: 8pt; color: #6b7280;">Overall Progress</div>
            <div style="font-size: 18pt; font-weight: bold; color: #1f2937; margin-top: 3px;">{{ $summary['overall_progress'] }}%</div>
            @if($summary['total_billing_percentage'] > 0)
            <div style="font-size: 8pt; color: #6b7280; margin-top: 5px;">Billing: <strong>{{ number_format($summary['total_billing_percentage'], 1) }}%</strong></div>
            @endif
        </div>
    </div>

    <!-- Milestones Table -->
    @if(count($milestones) > 0)
    <table class="milestone-table">
        <thead>
            <tr>
                <th style="width: 25px;">#</th>
                <th style="width: 140px;">Milestone</th>
                <th style="width: 100px;">Description</th>
                <th style="width: 70px;">Start</th>
                <th style="width: 70px;">Due</th>
                <th style="width: 70px;">Status</th>
                <th style="width: 80px;">Progress</th>
                <th style="width: 50px;">Tasks</th>
                @if($project['billing_type'] === 'milestone')
                <th style="width: 60px;">Billing %</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @foreach($milestones as $index => $milestone)
            <tr class="page-break-avoid">
                <td class="text-center">{{ $index + 1 }}</td>
                <td><strong>{{ $milestone['name'] }}</strong></td>
                <td>{{ $milestone['description'] ? (strlen($milestone['description']) > 30 ? substr($milestone['description'], 0, 30) . '...' : $milestone['description']) : '—' }}</td>
                <td class="date">{{ $milestone['start_date'] ? \Carbon\Carbon::parse($milestone['start_date'])->format('M d, Y') : '—' }}</td>
                <td class="date">{{ $milestone['due_date'] ? \Carbon\Carbon::parse($milestone['due_date'])->format('M d, Y') : '—' }}</td>
                <td>
                    <span class="status-badge status-{{ $milestone['status'] }}">
                        {{ str_replace('_', ' ', $milestone['status']) }}
                    </span>
                </td>
                <td>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: {{ $milestone['progress_percentage'] }}%;"></div>
                    </div>
                    <div class="progress-text">{{ $milestone['progress_percentage'] }}%</div>
                </td>
                <td class="text-center">
                    @if($milestone['total_tasks'] > 0)
                        {{ $milestone['completed_tasks'] }}/{{ $milestone['total_tasks'] }}
                    @else
                        —
                    @endif
                </td>
                @if($project['billing_type'] === 'milestone')
                <td class="text-center">
                    {{ $milestone['billing_percentage'] ? number_format($milestone['billing_percentage'], 1) . '%' : '—' }}
                </td>
                @endif
            </tr>
            
            <!-- Task Breakdown for this milestone -->
            @if(count($milestone['tasks']) > 0)
            <tr class="page-break-avoid">
                <td colspan="{{ $project['billing_type'] === 'milestone' ? 9 : 8 }}" class="task-section">
                    <h4>Tasks: {{ $milestone['name'] }}</h4>
                    <table class="task-table">
                        <thead>
                            <tr>
                                <th style="width: 120px;">Task</th>
                                <th style="width: 100px;">Description</th>
                                <th style="width: 80px;">Assigned</th>
                                <th style="width: 70px;">Due Date</th>
                                <th style="width: 70px;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($milestone['tasks'] as $task)
                            <tr>
                                <td><strong>{{ $task['title'] }}</strong></td>
                                <td>{{ $task['description'] ? (strlen($task['description']) > 25 ? substr($task['description'], 0, 25) . '...' : $task['description']) : '—' }}</td>
                                <td>{{ $task['assigned_to'] ?? '—' }}</td>
                                <td class="date">{{ $task['due_date'] ? \Carbon\Carbon::parse($task['due_date'])->format('M d, Y') : '—' }}</td>
                                <td>
                                    <span class="status-badge status-{{ $task['status'] }}">
                                        {{ str_replace('_', ' ', $task['status']) }}
                                    </span>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </td>
            </tr>
            @endif
            @endforeach
        </tbody>
    </table>
    @else
    <div style="text-align: center; padding: 20px; color: #6b7280;">
        <p style="font-size: 10pt;">No milestones found for this project.</p>
    </div>
    @endif

    <!-- Sign-off Section -->
    <div class="sign-off-section">
        <h3>Approval & Sign-off</h3>
        <table class="sign-off-table">
            <tr>
                <td>
                    <div class="sign-off-label">Contractor/Project Manager</div>
                    <div class="sign-off-line">
                        Signature: _________________________<br>
                        Name: _________________________<br>
                        Date: _________________________
                    </div>
                </td>
                <td>
                    <div class="sign-off-label">Client Approval</div>
                    <div class="sign-off-line">
                        Signature: _________________________<br>
                        Name: _________________________<br>
                        Date: _________________________
                    </div>
                </td>
            </tr>
        </table>
        <div style="margin-top: 10px; padding: 6px; background-color: #f9fafb; border: 1px solid #e5e7eb;">
            <div style="font-weight: bold; color: #374151; margin-bottom: 3px; font-size: 8pt;">Notes/Comments:</div>
            <div style="min-height: 40px; color: #6b7280; font-size: 8pt;">_________________________________________________________________<br>_________________________________________________________________</div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>This document is confidential and intended solely for the use of the parties involved in this project.</p>
        <p style="margin-top: 3px;">Generated by Abdurauf Sawadjaan Engineering Consultancy Project Management System</p>
        <p style="margin-top: 3px;">Generated on {{ $generated_at->format('F d, Y \a\t g:i A') }}</p>
    </div>
</body>
</html>
