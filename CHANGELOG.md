## v1.7.0

- Refresh discret, sub header, fără reîncărcarea paginii când se schimbă doar datele.
- Detectare versiune nouă, actualizare automată când este sigur și buton integrat în Setări.
- Cățelul, categoria, Setările și poziția se păstrează la actualizare; formularele deschise sunt protejate.
- Corectat respingerea Apple `BadWebPushTopic`; notificări independente de deschiderea aplicației, cu TTL de 24 ore.
- Resincronizare dispozitiv push fără o nouă cerere de permisiune.

## v1.6.0

- Header fix, separat de conținut, inclusiv în Setări și la reîncărcare.
- Bară fixă jos: Setări, Adaugă cățel și LogOut.
- Spațiu pentru zonele de siguranță iPhone și pentru indicatorul de refresh sub header.

## v1.4.0

- Acces administrat din MyAppsAdmin: invitații, retrimitere, retragere și reinvitare.
- Activare cu parolă din linkul invitației.
- Verificarea accesului la încărcare și revenire în aplicație; datele sunt păstrate la retragere.
- Notificările nu mai sunt trimise conturilor cu acces retras.

# MyPet

## 1.0.0

- Profiluri editabile pentru mai mulți căței, cu istoric separat.
- Adăugare și ștergere profil cu confirmare în pagină.
- Profilul Quintus Enzo păstrează toate înregistrările existente.
- Acces limitat la proprietar prin RLS și cheie străină compusă.
- Editarea necesită autentificare cu parolă în ultima oră.
- Footer: MyPet v1.0.0.

Înscrierea conturilor noi este dezactivată în configurația Supabase existentă. Conturile trebuie create de administrator până la activarea unui flux de înregistrare.
