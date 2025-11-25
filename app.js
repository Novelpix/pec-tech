// === SUPABASE CONFIG ===


// === Upload photo ===
async function uploadPhotoToSupabase(base64Data, fileName, equipmentId) {
    try {
        const parts = base64Data.split(';base64,');
        const contentType = parts[0].replace('data:', '');
        const byteCharacters = atob(parts[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }
        const file = new Blob(byteArrays, { type: contentType });

        const { error } = await supabaseClient
            .storage
            .from("pec-photos")
            .upload(`${equipmentId}/${fileName}`, file, {
                cacheControl: "3600",
                upsert: true
            });

        if (error) {
            console.error("Supabase upload error:", error);
            return null;
        }

        return `${SUPABASE_URL}/storage/v1/object/public/pec-photos/${equipmentId}/${fileName}`;
    } catch (err) {
        console.error("Upload failure:", err);
        return null;
    }
}

// === Save equipment into Supabase ===
async function saveEquipmentToSupabase(equipment) {
    try {
        const { data: eq, error: eqErr } = await supabaseClient
            .from("equipements")
            .insert(equipment)
            .select()
            .single();
        if (eqErr) {
            console.error("Supabase insert error:", eqErr);
            return false;
        }

        const eqId = eq.id;

        if (equipment.photos && equipment.photos.length > 0) {
            for (let i = 0; i < equipment.photos.length; i++) {
                const url = await uploadPhotoToSupabase(
                    equipment.photos[i],
                    `photo_${i}.jpg`,
                    eqId
                );
                if (url) {
                    await supabaseClient.from("photos").insert({
                        equipement_id: eqId,
                        url: url
                    });
                }
            }
        }
        return true;
    } catch (err) {
        console.error("Save error:", err);
        return false;
    }
}

// === Main save function ===
async function saveEquipment() {
    if (typeof generateEquipmentData !== "function") {
        alert("generateEquipmentData() MANQUANT dans le HTML original.");
        return;
    }

    const equipment = generateEquipmentData();

    if (typeof saveToLocalStorage === "function") {
        saveToLocalStorage(equipment);
    }

    const ok = await saveEquipmentToSupabase(equipment);

    if (ok) {
        alert("Équipement sauvegardé (Local + Supabase).");
    } else {
        alert("Sauvé localement mais ERREUR Supabase !");
    }
}
