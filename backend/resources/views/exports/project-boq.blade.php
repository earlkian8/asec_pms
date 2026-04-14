<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>BOQ — {{ $project['name'] }}</title>
    <style>
        @page {
            margin: 15mm 12mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 9pt;
            color: #1a1a2e;
            background: #fff;
        }

        /* ── Header ──────────────────────────────────────── */
        .doc-header {
            border-bottom: 2.5pt solid #1e293b;
            padding-bottom: 8pt;
            margin-bottom: 10pt;
        }
        .doc-title {
            font-size: 16pt;
            font-weight: bold;
            color: #1e293b;
            letter-spacing: 0.5pt;
        }
        .doc-subtitle {
            font-size: 10pt;
            color: #475569;
            margin-top: 1pt;
        }
        .project-info-grid {
            display: table;
            width: 100%;
            margin-top: 8pt;
        }
        .project-info-col {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        .info-row {
            margin-bottom: 3pt;
        }
        .info-label {
            font-size: 7.5pt;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
        }
        .info-value {
            font-size: 9pt;
            color: #1e293b;
            font-weight: bold;
        }

        /* ── Table ───────────────────────────────────────── */
        table.boq {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4pt;
            margin-bottom: 8pt;
        }
        table.boq thead tr {
            background-color: #1e293b;
            color: #fff;
        }
        table.boq thead th {
            padding: 5pt 6pt;
            text-align: left;
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 0.3pt;
        }
        table.boq thead th.num {
            text-align: right;
        }

        /* Section header row */
        tr.section-header td {
            background-color: #334155;
            color: #e2e8f0;
            font-weight: bold;
            font-size: 8.5pt;
            padding: 5pt 6pt;
        }

        /* Item rows */
        tr.item-odd td  { background-color: #f8fafc; }
        tr.item-even td { background-color: #ffffff; }
        table.boq tbody td {
            padding: 4pt 6pt;
            font-size: 8.5pt;
            color: #1e293b;
            border-bottom: 0.5pt solid #e2e8f0;
            vertical-align: top;
        }
        table.boq tbody td.num {
            text-align: right;
        }
        td.item-code {
            font-family: 'Courier New', monospace;
            font-size: 7.5pt;
            color: #64748b;
            white-space: nowrap;
        }
        td.description {
            max-width: 200pt;
        }
        .remarks-text {
            font-size: 7pt;
            color: #94a3b8;
            font-style: italic;
            margin-top: 1pt;
        }

        /* Section subtotal */
        tr.section-subtotal td {
            background-color: #f1f5f9;
            border-top: 1pt solid #94a3b8;
            font-weight: bold;
            font-size: 8.5pt;
            padding: 4pt 6pt;
            color: #334155;
        }
        tr.section-subtotal td.num {
            text-align: right;
        }

        /* Grand total */
        tr.grand-total td {
            background-color: #1e293b;
            color: #fff;
            font-weight: bold;
            font-size: 10pt;
            padding: 6pt 6pt;
        }
        tr.grand-total td.num {
            text-align: right;
        }

        /* ── Contract Summary ─────────────────────────────── */
        .contract-summary {
            margin-top: 8pt;
            border: 1pt solid #cbd5e1;
            border-radius: 3pt;
            overflow: hidden;
        }
        .contract-summary-title {
            background-color: #f1f5f9;
            padding: 5pt 8pt;
            font-weight: bold;
            font-size: 8.5pt;
            color: #334155;
            border-bottom: 1pt solid #cbd5e1;
        }
        .contract-rows {
            display: table;
            width: 100%;
        }
        .contract-row {
            display: table-row;
        }
        .contract-label, .contract-value {
            display: table-cell;
            padding: 4pt 8pt;
            font-size: 9pt;
            border-bottom: 0.5pt solid #e2e8f0;
        }
        .contract-label { color: #475569; }
        .contract-value { text-align: right; font-weight: bold; color: #1e293b; }
        .contract-variance-positive { color: #15803d; }
        .contract-variance-negative { color: #dc2626; }

        /* ── Footer ──────────────────────────────────────── */
        .doc-footer {
            margin-top: 12pt;
            border-top: 1pt solid #e2e8f0;
            padding-top: 5pt;
            font-size: 7.5pt;
            color: #94a3b8;
            display: table;
            width: 100%;
        }
        .footer-left  { display: table-cell; text-align: left; }
        .footer-right { display: table-cell; text-align: right; }
    </style>
</head>
<body>

    {{-- Document Header --}}
    <div class="doc-header">
        <div class="doc-title">BILL OF QUANTITIES</div>
        <div class="doc-subtitle">{{ $project['name'] }}{{ $project['code'] ? ' &mdash; ' . $project['code'] : '' }}</div>

        <div class="project-info-grid">
            <div class="project-info-col">
                @if($project['client'])
                <div class="info-row">
                    <div class="info-label">Client</div>
                    <div class="info-value">{{ $project['client']['name'] }}</div>
                </div>
                @endif
                @if($project['location'])
                <div class="info-row">
                    <div class="info-label">Location</div>
                    <div class="info-value">{{ $project['location'] }}</div>
                </div>
                @endif
                @if($project['project_type'])
                <div class="info-row">
                    <div class="info-label">Project Type</div>
                    <div class="info-value">{{ $project['project_type'] }}</div>
                </div>
                @endif
            </div>
            <div class="project-info-col">
                @if($project['start_date'])
                <div class="info-row">
                    <div class="info-label">Start Date</div>
                    <div class="info-value">{{ \Carbon\Carbon::parse($project['start_date'])->format('d M Y') }}</div>
                </div>
                @endif
                @if($project['planned_end_date'])
                <div class="info-row">
                    <div class="info-label">Planned End</div>
                    <div class="info-value">{{ \Carbon\Carbon::parse($project['planned_end_date'])->format('d M Y') }}</div>
                </div>
                @endif
                @if($project['contract_amount'] > 0)
                <div class="info-row">
                    <div class="info-label">Contract Amount</div>
                    <div class="info-value">₱{{ number_format($project['contract_amount'], 2) }}</div>
                </div>
                @endif
            </div>
        </div>
    </div>

    {{-- BOQ Table --}}
    <table class="boq">
        <thead>
            <tr>
                <th style="width:8%">Item No.</th>
                <th style="width:42%">Description</th>
                <th style="width:7%" class="num">Unit</th>
                <th style="width:9%" class="num">Qty</th>
                <th style="width:14%" class="num">Unit Rate (₱)</th>
                <th style="width:14%" class="num">Amount (₱)</th>
                <th style="width:6%" class="num">Remarks</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections as $section)
                {{-- Section header --}}
                <tr class="section-header">
                    <td colspan="7">
                        {{ $section['code'] ? $section['code'] . ' &mdash; ' : '' }}{{ $section['name'] }}
                        @if($section['description'])
                            &nbsp;<span style="font-size:7.5pt;font-weight:normal;color:#cbd5e1">{{ $section['description'] }}</span>
                        @endif
                    </td>
                </tr>

                {{-- Items --}}
                @forelse($section['items'] as $itemIndex => $item)
                    <tr class="{{ $itemIndex % 2 === 0 ? 'item-odd' : 'item-even' }}">
                        <td class="item-code">{{ $item['item_code'] ?: ($section['code'] ? $section['code'] . '.' . ($itemIndex + 1) : ($itemIndex + 1)) }}</td>
                        <td class="description">
                            {{ $item['description'] }}
                            @if($item['remarks'])
                                <div class="remarks-text">{{ $item['remarks'] }}</div>
                            @endif
                        </td>
                        <td class="num">{{ $item['unit'] }}</td>
                        <td class="num">{{ number_format($item['quantity'], 2) }}</td>
                        <td class="num">{{ number_format($item['unit_cost'], 2) }}</td>
                        <td class="num" style="font-weight:bold">{{ number_format($item['total_cost'], 2) }}</td>
                        <td></td>
                    </tr>
                @empty
                    <tr class="item-odd">
                        <td colspan="7" style="text-align:center;color:#94a3b8;font-style:italic;padding:6pt">
                            No items in this section.
                        </td>
                    </tr>
                @endforelse

                {{-- Section subtotal --}}
                <tr class="section-subtotal">
                    <td colspan="5" style="text-align:right;padding-right:12pt">
                        Subtotal — {{ $section['name'] }}
                    </td>
                    <td class="num">{{ number_format($section['subtotal'], 2) }}</td>
                    <td></td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align:center;color:#94a3b8;font-style:italic;padding:16pt">
                        No BOQ sections defined.
                    </td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="grand-total">
                <td colspan="5" style="text-align:right;padding-right:12pt">GRAND TOTAL</td>
                <td class="num">₱{{ number_format($grand_total, 2) }}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    {{-- Contract Summary --}}
    @if($contract_amount > 0)
    <div class="contract-summary">
        <div class="contract-summary-title">Contract Summary</div>
        <div class="contract-rows">
            <div class="contract-row">
                <div class="contract-label">Contract Amount</div>
                <div class="contract-value">₱{{ number_format($contract_amount, 2) }}</div>
            </div>
            <div class="contract-row">
                <div class="contract-label">BOQ Grand Total</div>
                <div class="contract-value">₱{{ number_format($grand_total, 2) }}</div>
            </div>
            <div class="contract-row">
                <div class="contract-label">
                    {{ $contract_variance >= 0 ? 'Under Contract by' : 'Over Contract by' }}
                </div>
                <div class="contract-value {{ $contract_variance >= 0 ? 'contract-variance-positive' : 'contract-variance-negative' }}">
                    ₱{{ number_format(abs($contract_variance), 2) }}
                </div>
            </div>
        </div>
    </div>
    @endif

    {{-- Footer --}}
    <div class="doc-footer">
        <div class="footer-left">
            ASEC Project Management System &mdash; Confidential
        </div>
        <div class="footer-right">
            Generated: {{ $generated_at->format('d M Y, h:i A') }}
        </div>
    </div>

</body>
</html>
