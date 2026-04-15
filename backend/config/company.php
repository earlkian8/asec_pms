<?php

return [
    'name'    => env('COMPANY_NAME', 'ASEC Construction'),
    'tagline' => env('COMPANY_TAGLINE', 'Engineering & Construction Services'),
    'address' => env('COMPANY_ADDRESS', ''),
    'phone'   => env('COMPANY_PHONE', ''),
    'email'   => env('COMPANY_EMAIL', ''),
    'website' => env('COMPANY_WEBSITE', ''),
    'tin'     => env('COMPANY_TIN', ''),
    'logo'    => env('COMPANY_LOGO', 'logo.svg'),

    'boq_terms' => [
        'Validity: This BOQ is valid for thirty (30) days from the date of issue.',
        'Payment Terms: As stipulated in the signed contract or as agreed in writing.',
        'Pricing is based on prevailing material and labor rates at the time of issue and may be subject to escalation.',
        'Quantities are estimates based on available drawings and specifications. Final billing shall be based on actual measured quantities executed on site.',
        'Any work not specifically listed in this BOQ is considered an extra and shall be quoted separately.',
    ],

    'signatories' => [
        'prepared_by' => ['title' => 'Prepared By', 'role' => 'Project Estimator'],
        'reviewed_by' => ['title' => 'Reviewed By', 'role' => 'Project Manager'],
        'approved_by' => ['title' => 'Approved By', 'role' => 'Authorized Representative'],
    ],
];
