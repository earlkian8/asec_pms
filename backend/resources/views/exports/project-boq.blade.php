<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Bill of Quantities</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 15mm 14mm 16mm 14mm;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'DejaVu Sans', Arial, sans-serif;
        }

        body {
            color: #1a2332;
            font-size: 8.7px;
            line-height: 1.4;
            background: #fff;
        }

        .page-break { page-break-after: always; }
        .no-break { page-break-inside: avoid; }

        /* ── HEADER ── */
        .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 10px;
            margin-bottom: 12px;
            border-bottom: 1.5px solid #273c52;
            position: relative;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo-wrap img {
            max-height: 48px;
            max-width: 48px;
        }

        .company-name {
            font-size: 14px;
            font-weight: 700;
            color: #0d2640;
            letter-spacing: 0.3px;
            line-height: 1.15;
        }

        .company-tagline {
            font-size: 7.8px;
            color: #5a6f84;
            margin-top: 1px;
            font-style: italic;
        }

        .company-meta {
            margin-top: 3px;
            font-size: 7.6px;
            color: #6b7f93;
            line-height: 1.45;
        }

        .header-right {
            text-align: right;
        }

        .doc-badge {
            display: inline-block;
            background: #fff;
            color: #1a3a5c;
            border: 1px solid #1a3a5c;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 4px 12px;
            margin-bottom: 6px;
        }

        .doc-meta-row {
            font-size: 7.8px;
            color: #5a6f84;
            margin-top: 2px;
        }

        .doc-meta-row span {
            font-weight: 700;
            color: #1a2332;
        }

        /* ── PROJECT TITLE BAND ── */
        .project-band {
            background: #fff;
            border: 1px solid #cfd9e3;
            border-left: 3px solid #1a3a5c;
            padding: 8px 12px;
            margin-bottom: 10px;
        }

        .project-band-name {
            font-size: 12px;
            font-weight: 700;
            color: #0d2640;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .project-band-sub {
            font-size: 7.8px;
            color: #6b7f93;
            margin-top: 2px;
        }

        /* ── INFO TABLE ── */
        .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 8px;
        }

        .info-grid td {
            border: 0.5px solid #d1dbe5;
            padding: 4px 8px;
        }

        .info-grid .lbl {
            color: #7a8fa3;
            text-transform: uppercase;
            font-size: 7.2px;
            letter-spacing: 0.4px;
            width: 13%;
            background: #fcfdff;
        }

        .info-grid .val {
            color: #0d2640;
            font-weight: 700;
            font-size: 8.2px;
            width: 24%;
        }

        /* ── KPI STRIP ── */
        .kpi-strip {
            display: flex;
            gap: 0;
            margin-bottom: 12px;
            border: 1px solid #cfd9e3;
        }

        .kpi-cell {
            flex: 1;
            padding: 8px 10px;
            border-right: 1px solid #d6e0e9;
            background: #fff;
        }

        .kpi-cell:last-child {
            border-right: none;
        }

        .kpi-cell.highlight {
            background: #f8fbff;
            border-left: 1.5px solid #1a3a5c;
            border-right: 1.5px solid #1a3a5c;
        }

        .kpi-cell.positive {
            background: #fcfffd;
        }

        .kpi-cell.negative {
            background: #fffdfd;
        }

        .kpi-lbl {
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #7a8fa3;
        }

        .kpi-cell.highlight .kpi-lbl {
            color: #5a6f84;
        }

        .kpi-val {
            font-size: 11px;
            font-weight: 700;
            color: #0d2640;
            margin-top: 3px;
        }

        .kpi-cell.highlight .kpi-val {
            color: #0d2640;
        }

        .kpi-cell.positive .kpi-val {
            color: #0f6e44;
        }

        .kpi-cell.negative .kpi-val {
            color: #a32d2d;
        }

        /* ── SECTION TITLES ── */
        .section-heading {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #1a3a5c;
            margin-top: 14px;
            margin-bottom: 5px;
            padding-bottom: 3px;
            border-bottom: 1.5px solid #1a3a5c;
        }

        /* ── BOQ TABLE ── */
        table.boq {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
            table-layout: fixed;
        }

        table.boq thead { display: table-header-group; }

        table.boq th {
            background: #f7fafe;
            color: #1a3a5c;
            border: 1px solid #9fb1c2;
            padding: 5px 5px;
            text-transform: uppercase;
            font-size: 7px;
            letter-spacing: 0.4px;
            text-align: center;
            font-weight: 700;
        }

        table.boq td {
            border: 1px solid #d2dce6;
            padding: 3.5px 5px;
            vertical-align: middle;
            color: #1a2332;
            word-wrap: break-word;
        }

        table.boq tr:nth-child(even) td {
            background: #fff;
        }

        table.boq .ctr { text-align: center; }
        table.boq .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }

        table.boq tr.sec-row td {
            background: #f7fafe;
            border-color: #b8cad9;
            color: #0d2640;
            font-weight: 700;
            font-size: 8.2px;
            padding: 5px 6px;
        }

        table.boq tr.sec-sub td {
            background: #fbfdff;
            font-weight: 700;
            color: #1a2332;
            border-top: 1px solid #aabecf;
        }

        table.boq tr.grand-total td {
            background: #fff;
            color: #0d2640;
            border-top: 1.5px solid #1a3a5c;
            border-bottom: 1.5px solid #1a3a5c;
            border-left: 1px solid #d2dce6;
            border-right: 1px solid #d2dce6;
            font-weight: 700;
            font-size: 8.5px;
            padding: 5px 5px;
        }

        table.boq tr.contract-summary td {
            background: #fbfdff;
            font-weight: 700;
            color: #0d2640;
            border-top: 1px solid #d2dce6;
            font-size: 8px;
        }

        .muted-empty {
            text-align: center;
            color: #8fa3b5;
            font-style: italic;
            padding: 7px;
            background: #fafbfd;
        }

        /* ── TERMS ── */
        .terms-box {
            border: 1px solid #d1dbe5;
            padding: 8px 10px;
            margin-top: 4px;
            background: #fff;
        }

        .terms-box ol {
            padding-left: 14px;
        }

        .terms-box li {
            font-size: 8px;
            color: #2e4258;
            line-height: 1.55;
            margin-bottom: 3px;
        }

        .terms-empty {
            font-size: 8px;
            color: #8fa3b5;
            font-style: italic;
        }

        /* ── SIGNATORIES ── */
        .sig-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
        }

        .sig-grid td {
            border: 1px solid #d1dbe5;
            padding: 8px 10px;
            vertical-align: top;
            width: 33.33%;
        }

        .sig-title {
            font-size: 7.2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1a3a5c;
            font-weight: 700;
        }

        .sig-line {
            margin-top: 28px;
            border-top: 1px solid #2a3f52;
            padding-top: 4px;
            font-size: 7.8px;
            color: #2d4558;
        }

        .sig-role {
            margin-top: 2px;
            font-size: 7.5px;
            color: #6b7f93;
        }

        /* ── CLIENT ACCEPTANCE ── */
        .client-box {
            border: 1.5px solid #1a3a5c;
            margin-top: 10px;
            padding: 10px 12px;
            background: #fff;
        }

        .client-box-title {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #1a3a5c;
            font-weight: 700;
            margin-bottom: 6px;
        }

        .client-box-body {
            font-size: 8.2px;
            color: #31495d;
            line-height: 1.55;
            margin-bottom: 10px;
        }

        .client-sign {
            width: 100%;
            border-collapse: collapse;
        }

        .client-sign td {
            width: 50%;
            padding-right: 8px;
            vertical-align: top;
        }

        .client-sign .line {
            border-top: 1px solid #2a3f52;
            padding-top: 3px;
            margin-top: 22px;
            font-size: 8px;
            color: #2d4558;
        }

        /* ── FOOTER ── */
        .doc-footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: -14mm;
            border-top: 1px solid #d1dbe5;
            padding-top: 4px;
            color: #8fa3b5;
            font-size: 7px;
            display: flex;
            justify-content: space-between;
            padding-left: 14mm;
            padding-right: 14mm;
        }

        .status-pill {
            display: inline-block;
            padding: 1px 7px;
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        /* column widths for landscape */
        .col-code   { width: 8%; }
        .col-desc   { width: 30%; }
        .col-unit   { width: 6%; }
        .col-qty    { width: 7%; }
        .col-mat    { width: 12%; }
        .col-lab    { width: 12%; }
        .col-unit-c { width: 11%; }
        .col-total  { width: 14%; }
    </style>
</head>
<body>

<div class="doc-footer">
    <span>{{ $company['name'] }} &nbsp;|&nbsp; BOQ-{{ $project['code'] }}</span>
    <span>Generated {{ $generated_at->format('M d, Y \a\t h:i A') }}</span>
    <span>CONFIDENTIAL — FOR CLIENT USE ONLY</span>
</div>

<!-- ══════════════════════════════════════════
     HEADER
══════════════════════════════════════════ -->
<div class="doc-header">
    <div class="header-left">
        @if(!empty($company['logo_src']))
        <div class="logo-wrap"><img src="{{ $company['logo_src'] }}" alt="logo" /></div>
        @endif
        <div>
            <div class="company-name">{{ $company['name'] }}</div>
            @if($company['tagline'])<div class="company-tagline">{{ $company['tagline'] }}</div>@endif
            <div class="company-meta">
                @if($company['address']){{ $company['address'] }}<br>@endif
                @if($company['phone'])T: {{ $company['phone'] }}@endif
                @if($company['email']) &nbsp;|&nbsp; E: {{ $company['email'] }}@endif
                @if($company['website']) &nbsp;|&nbsp; {{ $company['website'] }}@endif
                @if($company['tin'])<br>TIN: {{ $company['tin'] }}@endif
            </div>
        </div>
    </div>
    <div class="header-right">
        <div class="doc-badge">Bill of Quantities</div>
        <div class="doc-meta-row">Reference No: <span>BOQ-{{ $project['code'] }}</span></div>
        <div class="doc-meta-row">Date Issued: <span>{{ $generated_at->format('F d, Y') }}</span></div>
    </div>
</div>

<!-- PROJECT TITLE BAND -->
<div class="project-band">
    <div class="project-band-name">{{ $project['name'] }}</div>
    <div class="project-band-sub">Detailed Cost Proposal — For Formal Review and Approval</div>
</div>

<!-- PROJECT INFO -->
<table class="info-grid">
    <tr>
        <td class="lbl">Project Code</td><td class="val">{{ $project['code'] }}</td>
        <td class="lbl">Project Type</td><td class="val">{{ $project['project_type'] ?? '—' }}</td>
        <td class="lbl">Start Date</td><td class="val">{{ $project['start_date'] ? \Carbon\Carbon::parse($project['start_date'])->format('M d, Y') : '—' }}</td>
        <td class="lbl">Planned End</td><td class="val">{{ $project['planned_end_date'] ? \Carbon\Carbon::parse($project['planned_end_date'])->format('M d, Y') : '—' }}</td>
    </tr>
    <tr>
        <td class="lbl">Client</td><td class="val">{{ $project['client']['name'] ?? '—' }}</td>
        <td class="lbl">Client Code</td><td class="val">{{ $project['client']['code'] ?? '—' }}</td>
        <td class="lbl">Location</td><td class="val">{{ $project['location'] ?? '—' }}</td>
        <td class="lbl">Status</td><td class="val">{{ ucfirst($project['status'] ?? '—') }}</td>
    </tr>
    <tr>
        <td class="lbl">Contract Amt.</td><td class="val">PHP {{ number_format($contract_amount, 2) }}</td>
        <td class="lbl">Date Prepared</td><td class="val">{{ $generated_at->format('M d, Y') }}</td>
        <td class="lbl" colspan="2"></td>
        <td class="lbl" colspan="2"></td>
    </tr>
</table>

<!-- KPI STRIP -->
<div class="kpi-strip">
    <div class="kpi-cell">
        <div class="kpi-lbl">Material Cost</div>
        <div class="kpi-val">PHP {{ number_format($grand_material, 2) }}</div>
    </div>
    <div class="kpi-cell">
        <div class="kpi-lbl">Labor Cost</div>
        <div class="kpi-val">PHP {{ number_format($grand_labor, 2) }}</div>
    </div>
    <div class="kpi-cell highlight">
        <div class="kpi-lbl">Grand Total</div>
        <div class="kpi-val">PHP {{ number_format($grand_total, 2) }}</div>
    </div>
    <div class="kpi-cell {{ $contract_variance >= 0 ? 'positive' : 'negative' }}">
        <div class="kpi-lbl">Contract Variance</div>
        <div class="kpi-val">PHP {{ number_format($contract_variance, 2) }}</div>
    </div>
</div>

<!-- BOQ TABLE -->
<div class="section-heading">Detailed Bill of Quantities</div>

<table class="boq">
    <thead>
        <tr>
            <th class="col-code">Item Code</th>
            <th class="col-desc" style="text-align:left;">Description</th>
            <th class="col-unit">Unit</th>
            <th class="col-qty">Qty</th>
            <th class="col-mat">Material Cost</th>
            <th class="col-lab">Labor Cost</th>
            <th class="col-unit-c">Unit Cost</th>
            <th class="col-total">Total Amount</th>
        </tr>
    </thead>
    <tbody>
        @foreach($sections as $section)
            <tr class="sec-row">
                <td colspan="8">{{ $section['code'] ? $section['code'] . ' &nbsp;|&nbsp; ' : '' }}{{ $section['name'] }}</td>
            </tr>
            @forelse($section['items'] as $item)
                <tr>
                    <td class="ctr" style="color:#4a6278;">{{ $item['item_code'] ?? '' }}</td>
                    <td>{{ $item['description'] }}</td>
                    <td class="ctr">{{ $item['unit'] }}</td>
                    <td class="num">{{ rtrim(rtrim(number_format($item['quantity'], 4, '.', ''), '0'), '.') }}</td>
                    <td class="num">{{ number_format($item['material_cost'], 2) }}</td>
                    <td class="num">{{ number_format($item['labor_cost'], 2) }}</td>
                    <td class="num">{{ number_format($item['unit_cost'], 2) }}</td>
                    <td class="num" style="font-weight:600;">{{ number_format($item['total_cost'], 2) }}</td>
                </tr>
            @empty
                <tr><td colspan="8" class="muted-empty">No items available for this section.</td></tr>
            @endforelse
            <tr class="sec-sub">
                <td colspan="4" style="text-align:right; padding-right:8px; font-size:7.5px; letter-spacing:0.3px; text-transform:uppercase; color:#5a7088;">Section Subtotal</td>
                <td class="num">{{ number_format($section['subtotal_material'], 2) }}</td>
                <td class="num">{{ number_format($section['subtotal_labor'], 2) }}</td>
                <td></td>
                <td class="num">{{ number_format($section['subtotal'], 2) }}</td>
            </tr>
        @endforeach

        <tr class="grand-total">
            <td colspan="4" style="text-align:right; padding-right:8px; letter-spacing:0.5px;">GRAND TOTAL</td>
            <td class="num">{{ number_format($grand_material, 2) }}</td>
            <td class="num">{{ number_format($grand_labor, 2) }}</td>
            <td></td>
            <td class="num">{{ number_format($grand_total, 2) }}</td>
        </tr>
        <tr class="contract-summary">
            <td colspan="7" style="text-align:right; padding-right:8px; font-size:7.5px; text-transform:uppercase; letter-spacing:0.3px; color:#3a5570;">
                Contract Amount: PHP {{ number_format($contract_amount, 2) }} &nbsp;|&nbsp; Variance:
            </td>
            <td class="num" style="font-weight:700; color: {{ $contract_variance >= 0 ? '#0f6e44' : '#a32d2d' }};">
                PHP {{ number_format($contract_variance, 2) }}
            </td>
        </tr>
    </tbody>
</table>

<!-- ══════════════════════════════════════════
     PAGE 2 — TERMS & SIGNATURES
══════════════════════════════════════════ -->
<div class="page-break"></div>

<div class="doc-header">
    <div class="header-left">
        @if(!empty($company['logo_src']))
        <div class="logo-wrap"><img src="{{ $company['logo_src'] }}" alt="logo" /></div>
        @endif
        <div>
            <div class="company-name">{{ $company['name'] }}</div>
            @if($company['tagline'])<div class="company-tagline">{{ $company['tagline'] }}</div>@endif
        </div>
    </div>
    <div class="header-right">
        <div class="doc-badge">BOQ-{{ $project['code'] }}</div>
        <div class="doc-meta-row">Terms, Conditions &amp; Acceptance</div>
    </div>
</div>

<div class="section-heading">Terms and Conditions</div>
<div class="terms-box">
    @if(count($terms))
        <ol>
            @foreach($terms as $term)
                <li>{{ $term }}</li>
            @endforeach
        </ol>
    @else
        <div class="terms-empty">No additional terms provided for this BOQ document.</div>
    @endif
</div>

<div class="section-heading" style="margin-top:18px;">Authorizations</div>
<table class="sig-grid no-break">
    <tr>
        @forelse($signatories as $sig)
        <td>
            <div class="sig-title">{{ $sig['title'] }}</div>
            <div class="sig-line">Printed Name &amp; Signature Over Printed Name</div>
            <div class="sig-role">{{ $sig['role'] }}</div>
            <div class="sig-role" style="margin-top:4px;">Date: _______________________________</div>
        </td>
        @empty
        <td colspan="3" class="muted-empty">No signatories configured.</td>
        @endforelse
    </tr>
</table>

<div class="client-box no-break">
    <div class="client-box-title">Client Acceptance</div>
    <div class="client-box-body">
        I/We, the undersigned, hereby acknowledge receipt of this Bill of Quantities and accept the scope, quantities, and
        pricing herein as the formal basis for the contracted work for
        <strong>{{ $project['name'] }}</strong> (Ref: {{ $project['code'] }}) in the total amount of
        <strong>PHP {{ number_format($grand_total, 2) }}</strong>, subject to the terms and conditions stated above.
    </div>
    <table class="client-sign">
        <tr>
            <td><div class="line">Authorized Client Representative — Signature Over Printed Name</div></td>
            <td><div class="line">Date</div></td>
        </tr>
    </table>
</div>

</body>
</html>