-- Source: mobile/src/demo/seed.ts (15 actual repository monuments).
-- Stable UUIDv5 IDs use the URL namespace and https://monument-capture.local/monuments/{slug}.
INSERT INTO app.monuments (id, name, neighborhood, latitude, longitude, capture_radius_m, description) VALUES
    ('fd8ede76-6677-5d37-8754-9822f0d692cb', 'Statue of Liberty', 'Liberty Island', 40.6892, -74.0445, 150, 'Copper colossus in New York Harbor, dedicated 1886.'),
    ('cc45a546-589d-5fba-ad96-669aa40f8482', 'Washington Square Arch', 'Greenwich Village', 40.7312, -73.9971, 100, 'Marble triumphal arch at the foot of Fifth Avenue.'),
    ('65a479ac-aeab-5827-8864-c390c935bab6', 'Soldiers'' and Sailors'' Arch', 'Prospect Heights', 40.673, -73.97, 100, 'Civil War memorial arch at Grand Army Plaza.'),
    ('93b998fe-d276-5850-940b-989801f22137', 'Brooklyn War Memorial', 'Downtown Brooklyn', 40.7005, -73.9897, 80, 'Memorial to Brooklyn''s WWII dead in Cadman Plaza.'),
    ('1ad5371f-b3cd-58ea-bb38-4af20493baf9', 'General Grant National Memorial', 'Morningside Heights', 40.8134, -73.9631, 100, 'The largest mausoleum in North America.'),
    ('7781d18c-dbfe-5211-95ad-bda486af39d6', 'Bethesda Fountain', 'Central Park', 40.7744, -73.9703, 80, 'Angel of the Waters, centrepiece of Bethesda Terrace.'),
    ('61f704f1-698f-5fad-b0ff-b804a2996067', 'Cleopatra''s Needle', 'Central Park', 40.7796, -73.9654, 80, 'Ancient Egyptian obelisk behind the Met.'),
    ('ebac0b7f-2f66-50fc-860b-4eed08827d7d', 'Columbus Monument', 'Columbus Circle', 40.7681, -73.9819, 80, 'Granite column at the southwest corner of Central Park.'),
    ('b9670e1c-420c-5deb-8f90-24408813b2bd', 'Worth Monument', 'Flatiron District', 40.7425, -73.9898, 60, 'Obelisk and tomb of General William Jenkins Worth.'),
    ('81000a73-e51f-503f-ab23-cf8f5aa5a469', 'Charging Bull', 'Financial District', 40.7056, -74.0134, 60, 'Bronze bull on Broadway at Bowling Green.'),
    ('de90da4b-c558-5561-891e-c7408f5f65b8', 'George Washington at Federal Hall', 'Financial District', 40.7073, -74.0104, 60, 'Statue marking the site of Washington''s 1789 inauguration.'),
    ('bde098a7-3e36-5645-b0ab-64b91b9c12e9', 'Alice in Wonderland', 'Central Park', 40.7755, -73.9666, 60, 'Bronze sculpture near Conservatory Water.'),
    ('8ec68370-1b0a-50ab-8a0d-b178bb755d50', 'Strawberry Fields ''Imagine'' Mosaic', 'Central Park', 40.7757, -73.975, 60, 'Memorial mosaic near the Dakota.'),
    ('1f426d91-1647-5094-af5d-437b24e90749', 'Prison Ship Martyrs'' Monument', 'Fort Greene', 40.6915, -73.9755, 100, 'Doric column honouring Revolutionary War prisoners.'),
    ('6a8716bd-e979-5306-9859-817628b43ad9', 'Admiral Farragut Monument', 'Madison Square', 40.7426, -73.9878, 60, 'Saint-Gaudens bronze in Madison Square Park.');
