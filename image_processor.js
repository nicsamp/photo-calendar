let images_data = {};
chrome.storage.local.get(['images_data'], (result) => {
  images_data = result.images_data || {};
});

async function drive_request_data(fields, file = null, query = null) {
  let full_data = [];
  let next_page_token = null;

  if (file === null) {
    fields += ',nextPageToken';
  }
  do {
    let url = `https://www.googleapis.com/drive/v3/files${file ? `/${file}` : ''}?${query ? `q=${encodeURIComponent(query)}&` : ''}fields=${fields}&pageSize=1000`;
    if (next_page_token) {
      url += `&pageToken=${page_token}`;
    }

    let response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + curr_token }
    });

    if (response.status === 401) {
        await new Promise(r => chrome.identity.removeCachedAuthToken({ token: curr_token }, r));
        curr_token = await new Promise(r => chrome.identity.getAuthToken({ interactive: false }, r));
        drive_request_data(fields, file, query);
      }
    else if (!response.ok) throw new Error("API Request failed: " + response.status);
  
    const data = await response.json();
    full_data.push(data);

    next_page_token = data.nextPageToken;
  } while (next_page_token);

  return full_data;
}

async function drive_request_images_recursive(fields, query, folder_id) {
  let full_data = [];
  let folder_queue = [folder_id];

  while (folder_queue.length > 0) {
    const curr_folder_id = folder_queue.shift();
    const new_query = `'${curr_folder_id}' in parents and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')${query ? ` and ${query}` : ''}`;
  
    const full_folder_data = await drive_request_data(fields, null, new_query);
    console.log(full_folder_data);
    for (const folder_data of full_folder_data) {
      for (const file of folder_data.files) {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          folder_queue.push(file.id);
        }
        else {
          full_data.push(file);
        }
      }
    }
  }

  return full_data;
}

async function get_images_metadata() {
  const query = "trashed = false";
  const fields = "files(id, mimeType, imageMediaMetadata)";
  const full_data = await drive_request_images_recursive(fields, query, FOLDER_ID);

  images_data = {};
  for (const file of full_data) {
    const date = file.imageMediaMetadata?.time;
    if (date) {
      const [year, month, day, hour, minute, second] = date.split(/[: ]/).map(Number);
      let object = {'id': file.id,
                    'h': hour,
                    'm': minute,
                    's': second
      }
      if (!images_data[year]) {
        images_data[year] = {};
      }
      if (!images_data[year][month]) {
          images_data[year][month] = {};
      }
      if (!images_data[year][month][day]) {
          images_data[year][month][day] = [];
      }
      images_data[year][month][day].push(object);
    }
    else {
      let object = {'id': file.id,
                    'h': -1,
                    'm': -1,
                    's': -1
      }
      if (!images_data["-1"]) {
        images_data["-1"] = {};
      }
      if (!images_data["-1"]["-1"]) {
          images_data["-1"]["-1"] = {};
      }
      if (!images_data["-1"]["-1"]["-1"]) {
          images_data["-1"]["-1"]["-1"] = [];
      }
      images_data["-1"]["-1"]["-1"].push(object);
    }
  }

  chrome.storage.local.set({ 'images_data': images_data });
}

async function get_image(id) {
  const fields = "thumbnailLink";

  const data = await drive_request_data(fields, file = id);
  return data[0].thumbnailLink;
}