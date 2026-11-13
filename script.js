let els = {};
let date = null;
let first_date = null;
let last_date = null;
const WEEKS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
let curr_mode = 1; //year = 0, month = 1, day = 2, single = 3
let img_i = 0;
let curr_token = null;

let FOLDER_ID = null;
let images_data = {};

const TARGET_HEIGHT = 200;
const GAP = 8;

function toggle_light_dark_mode() {
    els.body.classList.toggle('dark-mode');
    if (els.body.classList.contains('dark-mode')) {
        els.dark_icon.classList.remove('hidden');
        els.light_icon.classList.add('hidden');
    }
    else {
        els.light_icon.classList.remove('hidden');
        els.dark_icon.classList.add('hidden');
    }
}

function wait_for_images(images) {
    const promises = Array.from(images).map(img => {
        return new Promise(resolve => {
            // If the browser has already loaded the image, resolve immediately
            if (img.complete) {
                resolve();
            } else {
                img.addEventListener('load', () => resolve());
                img.addEventListener('error', () => resolve()); // Resolve anyway on error to avoid hanging
            }
        });
    });
    
    return Promise.all(promises);
}

async function get_cover_image(day_data) {
    let id = day_data[0].id;
    for (let img_i = 0; img_i < day_data.length; img_i++) {
        if (day_data[img_i].is_img) {
            id = day_data[img_i].id;
            break;
        }
    }

    return await get_image(id);
}

async function update_images_data() {
    els.curr_folder_label.textContent = "Loading folder...";
    els.update_images.classList.add("loading");
    await get_images_metadata();
    els.curr_folder_label.textContent = await get_folder_name(FOLDER_ID);
    els.update_images.classList.remove("loading");
    find_first_last_dates();
    show_view();
}

function show_view() {
    if (curr_mode === 0) {
        show_year_view();
    }
    else if (curr_mode === 1) {
        show_month_view();
    }
    else if (curr_mode === 2) {
        show_day_view();
    }
    else if (curr_mode === 3) {
        show_single_view();
    }
}

function find_first_last_dates() {
    let first = null;
    let last = null;

    for (const year of Object.keys(images_data)) {
        if (year == -1) {
            continue;
        }
        for (const month of Object.keys(images_data[year])) {
            for (const day of Object.keys(images_data[year][month])) {
                const curr_date = Temporal.PlainDate.from({ year: parseInt(year), month: parseInt(month), day: parseInt(day) });
                if (!first || (Temporal.PlainDate.compare(curr_date, first) === -1)) {
                    first = curr_date;
                }
                if (!last ||  (Temporal.PlainDate.compare(curr_date, last) === 1)) {
                    last = curr_date;
                }
            }
        }
    }

    first_date = first;
    last_date = last;
    date = last_date;
    els.next_date.disabled = true;
}

function change_date(change) {
    if (curr_mode === 0) {
        date = date.add({ years: change });
        while (images_data?.[date.year] === undefined) {
            date = date.add({ years: change });
        }
        if (date.year == first_date.year) {
            els.prev_date.disabled = true;
        }
        else {
            els.prev_date.disabled = false;
        }
        if (date.year == last_date.year) {
            els.next_date.disabled = true;
        }
        else {
            els.next_date.disabled = false;
        }
    }
    else if (curr_mode === 1) {
        date = date.add({ months: change });
        while (images_data?.[date.year]?.[date.month] === undefined) {
            date = date.add({ months: change });
        }
        if (date.year == first_date.year && date.month == first_date.month) {
            els.prev_date.disabled = true;
        }
        else {
            els.prev_date.disabled = false;
        }
        if (date.year == last_date.year && date.month == last_date.month) {
            els.next_date.disabled = true;
        }
        else {
            els.next_date.disabled = false;
        }
    }
    else if (curr_mode === 2) {
        date = date.add({ days: change });
        while (images_data?.[date.year]?.[date.month]?.[date.day] === undefined) {
            date = date.add({ days: change });
        }
        if (date.equals(first_date)) {
            els.prev_date.disabled = true;
        }
        else {
            els.prev_date.disabled = false;
        }
        if (date.equals(last_date)) {
            els.next_date.disabled = true;
        }
        else {
            els.next_date.disabled = false;
        }
    }
    else if (curr_mode === 3) {
        img_i += change
        while (images_data?.[date.year]?.[date.month]?.[date.day]?.[img_i] === undefined) {
            const day_images = images_data?.[date.year]?.[date.month]?.[date.day];
            if (day_images === undefined || day_images.length === 0) {
                date = date.add({ days: change});
                let next_day_images = images_data?.[date.year]?.[date.month]?.[date.day];
                if (next_day_images === undefined || next_day_images.length === 0) {
                    next_day_images = [null];
                }
                img_i = change > 0 ? 0 : next_day_images.length - 1;
            }
            else if ((img_i >= day_images.length) || (img_i < 0)) {
                date = date.add({ days: change });
                let next_day_images = images_data?.[date.year]?.[date.month]?.[date.day];
                if (next_day_images === undefined || next_day_images.length === 0) {
                    next_day_images = [null];
                }
                img_i = change > 0 ? 0 : next_day_images.length - 1;
            }
            else {
                img_i += change;
            }
        }
        if (date.equals(first_date) && (img_i === 0)) {
            els.prev_date.disabled = true;
        }
        else {
            els.prev_date.disabled = false;
        }
        if (date.equals(last_date) && (img_i === (images_data?.[date.year]?.[date.month]?.[date.day].length - 1))) {
            els.next_date.disabled = true;
        }
        else {
            els.next_date.disabled = false;
        }
    }

    show_view();
}

function selected_single(event) {
    img_i = parseInt(event.currentTarget.dataset.i);
    curr_mode = 3;
    change_date(0);
}

function selected_day(event) {
    curr_mode = 2;

    if (event === null) {
        change_date(0);
        return;
    }

    date = date.with({ day: parseInt(event.currentTarget.dataset.id) });
    change_date(0);
}

function selected_month(event) {
    curr_mode = 1;

    if (event === null) {
        change_date(0);
        return;
    }

    date = date.with({ month: parseInt(event.currentTarget.dataset.id) });
    change_date(0);
}

function selected_year() {
    curr_mode = 0;
    change_date(0);
}

function show_month_weeks(week_box) {
    for (let i = 0; i < 7; i++) {
        let week = document.createElement('li');
        week.textContent = WEEKS[i];
        week_box.appendChild(week);
    }
}

async function show_month_view() {
    curr_token = await new Promise(r => chrome.identity.getAuthToken({ interactive: false }, r));

    els.day_view.classList.add('hidden');
    els.month_view.classList.remove('hidden');
    els.year_view.classList.add('hidden');
    els.single_view.classList.add('hidden');

    let year = date.year;
    let month = date.month;
    let month_data = {};
    if (images_data?.[year]?.[month] !== undefined) {
        month_data = images_data[year][month];
    }
    
    els.cal_label.textContent = date.toLocaleString('pt-BR', params={month: 'long', year: 'numeric'});

    let days = els.month_days;
    days.replaceChildren();

    let num_days = date.daysInMonth;
    let start_blanks = (date.with({ day: 1 }).dayOfWeek - 1) % 7 + 1
    let num_spaces = 7 * 6;
    let my_mode = curr_mode;
    let my_date = date;

    for (let i = -start_blanks; i < num_spaces - start_blanks; i++) {
        let day = document.createElement('li');

        if ((i >= 0) && (i < num_days)) {
            let day_label = document.createElement('p');

            day_label.textContent = i + 1;
            day.appendChild(day_label);

            if (month_data?.[i + 1] !== undefined) {
                day.classList.add('image-space');
                let image = document.createElement('img');
                image.src = await get_cover_image(month_data[i + 1]);

                image.dataset.id = i + 1;
                image.addEventListener('click', (e) => {selected_day(e);});
                day.appendChild(image);
            }
        }
        else if (i === -start_blanks) {
            day.classList.add('blank-space');
            day.innerHTML = '<button class="icon-button month-back"><i class="material-symbols-outlined">event_repeat</i></button>';
            day.children[0].addEventListener('click', selected_year);
        }
        else {
            day.classList.add('blank-space');
        }

        if ((my_mode != curr_mode) || (my_date != date)) {
            return;
        }
        days.appendChild(day);
    }
}

async function show_year_view() {
    curr_token = await new Promise(r => chrome.identity.getAuthToken({ interactive: false }, r));

    els.day_view.classList.add('hidden');
    els.month_view.classList.add('hidden');
    els.year_view.classList.remove('hidden');
    els.single_view.classList.add('hidden');

    let year = date.year;
    let year_data;
    if (images_data?.[year] !== undefined) {
        year_data = images_data[year];
    }
    
    els.cal_label.textContent = date.toLocaleString('pt-BR', params = {year: 'numeric'});

    let months = els.year_months;
    months.replaceChildren();

    let my_mode = curr_mode;
    let my_date = date;

    for (let i = 0; i < date.monthsInYear; i++) {
        let month = document.createElement('div');
        month.dataset.id = i + 1;

        let month_label = document.createElement('h2');
        month_label.textContent = date.with({ month: i + 1 }).toLocaleString('pt-BR', params = {month: 'long'});
        month.appendChild(month_label)

        let month_days = document.createElement('ol');
        month.appendChild(month_days);
        months.appendChild(month);
        
        let month_date = date.with({ month: i + 1});
        let month_data;
        if (year_data?.[i + 1] !== undefined) {
            month_data = year_data[i + 1];
        }

        let num_days = month_date.daysInMonth;
        let start_blanks = month_date.with({ day: 1 }).dayOfWeek % 7
        let num_spaces = 7 * 6;
        let has_images = false;
        for (let j = -start_blanks; j < num_spaces - start_blanks; j++) {
            let day = document.createElement('li');

            if ((j >= 0) && (j < num_days) && (month_data?.[j + 1] !== undefined)) {
                if (!has_images) {
                    has_images = true;
                    month.addEventListener('click', (e) => {selected_month(e)});
                    month.classList.add('month-button');
                }
                let day_data = month_data[j + 1];
                let image = document.createElement('img');
                image.src = await get_cover_image(day_data);
                
                if ((my_mode != curr_mode) || (my_date != date)) {
                    return;
                }
                
                day.appendChild(image);
            }

            month_days.appendChild(day);
        }
    }
}

async function show_day_view() {
    curr_token = await new Promise(r => chrome.identity.getAuthToken({ interactive: false }, r));

    els.day_view.classList.remove('hidden');
    els.month_view.classList.add('hidden');
    els.year_view.classList.add('hidden');
    els.single_view.classList.add('hidden');

    let year = date.year;
    let month = date.month;
    let day = date.day;
    let day_data = [];
    if (images_data?.[year]?.[month]?.[day] !== undefined) {
        day_data = images_data[year][month][day];
    }
    
    els.cal_label.textContent = date.toLocaleString('pt-BR', params={month: 'long', year: 'numeric', day: 'numeric'}) + ` (${date.toLocaleString('pt-BR', params={weekday: 'short'})})`;

    let image_list = els.day_image_list;
    let list_w = image_list.clientWidth - 26;
    image_list.replaceChildren();

    let my_mode = curr_mode;
    let my_date = date;

    let image_queue = []
    let curr_w = 0;
    let last_upscale = 1;

    for (const [i, single_image_data] of day_data.entries()) {
        if ((my_mode != curr_mode) || (my_date != date)) {
            return;
        }
        let container = document.createElement('li');
        container.addEventListener('click', (e) => {selected_single(e)})
        container.dataset.i = i;        

        let image = document.createElement('img');
        image.src = await get_image(single_image_data.id);
        let ratio = single_image_data.ratio;
        image.dataset.ratio = ratio;

        let new_w = ratio * TARGET_HEIGHT;

        if ((curr_w + new_w + image_queue.length * GAP) > list_w) {
            let upscale = (list_w - (image_queue.length - 1) * GAP) / curr_w;
            image_queue.forEach((img_item) => {
                const img_el = img_item.img;
                const scaled_w = img_item.new_w * upscale;
                const scaled_h = TARGET_HEIGHT * upscale;
                img_el.style.width = `${scaled_w}px`;
                img_el.style.height = `${scaled_h}px`;
                img_el.src = change_image_size(img_el.src, Math.max(scaled_w, scaled_h));
                image_list.appendChild(img_item.container);
            });

            image_queue = [];
            curr_w = 0;
            last_upscale = upscale;
        }

        container.appendChild(image);
        image_queue.push({ img: image, container: container, new_w: new_w });
        curr_w += new_w;
    }

    if (image_queue.length > 0) {
        let upscale = (list_w - (image_queue.length - 1) * GAP) / curr_w;
        let actual_upscale = Math.min(upscale, last_upscale);
            image_queue.forEach((img_item) => {
                const img_el = img_item.img;
                const scaled_w = img_item.new_w * actual_upscale;
                const scaled_h = TARGET_HEIGHT * actual_upscale;
                img_el.style.width = `${scaled_w}px`;
                img_el.style.height = `${scaled_h}px`;
                img_el.src = change_image_size(img_el.src, Math.max(scaled_w, scaled_h));
                image_list.appendChild(img_item.container);
            });
    }
}

function justify_day_view(height, gap) {
    let image_list = els.day_image_list;
    let list_w = image_list.clientWidth - 26;
    let images = Array.from(image_list.children);

    let curr_row = [];
    let curr_row_w = 0;
    let last_upscale = 1;

    images.forEach((item, i) => {
        const img = item.querySelector('img');
        const ratio = img.dataset.ratio;
        const new_w = ratio * height;

        if ((curr_row_w + new_w + curr_row.length * gap) > list_w) {
            let upscale = (list_w - (curr_row.length - 1) * gap) / curr_row_w;
            curr_row.forEach((row_item) => {
                const img_el = row_item.img;
                const scaled_w = row_item.new_w * upscale;
                const scaled_h = TARGET_HEIGHT * upscale;
                img_el.style.width = `${scaled_w}px`;
                img_el.style.height = `${scaled_h}px`;
                img_el.src = change_image_size(img_el.src, Math.max(scaled_w, scaled_h));
            });

            curr_row = [];
            curr_row_w = 0;
            last_upscale = upscale;
        }

        curr_row.push({ img: img, new_w: new_w });
        curr_row_w += new_w;
    });

    if (curr_row.length > 0) {
        let upscale = (list_w - (curr_row.length - 1) * gap) / curr_row_w;
        let actual_upscale = Math.min(upscale, last_upscale);
        curr_row.forEach((row_item) => {
            const img_el = row_item.img;
            const scaled_w = row_item.new_w * actual_upscale;
            const scaled_h = TARGET_HEIGHT * actual_upscale;
            img_el.style.width = `${scaled_w}px`;
            img_el.style.height = `${scaled_h}px`;
            img_el.src = change_image_size(img_el.src, Math.max(scaled_w, scaled_h));
        });
    }
}

function hide_select_folder_box() {
    els.select_folder_box.classList.add('hidden');
    els.select_link_button.classList.remove('hidden');
    els.select_link_loader.classList.add('hidden');
    els.select_link_input.value = '';
    els.select_link_input.classList.add('input-error');
}

async function select_folder(source) {
    els.select_link_button.classList.add('hidden');
    els.select_link_loader.classList.remove('hidden');

    let temp_folder_id;
    if (source === 'link') {
        try {
            let base_link = els.select_link_input.value.trim().split('?')[0];
            let split_link = base_link.split('/');
            temp_folder_id = split_link.at(-1);
            if (temp_folder_id === '') {
                temp_folder_id = split_link.at(-2);
            }
        }
        catch (error) {
            console.error('Invalid link');
            els.select_link_button.classList.remove('hidden');
            els.select_link_loader.classList.add('hidden');
            els.select_link_input.value = '';
            els.select_link_input.classList.add('input-error');
            return;
        }
    }

    FOLDER_ID = temp_folder_id;
    chrome.storage.local.set({ 'folder_id': FOLDER_ID });

    hide_select_folder_box();

    await update_images_data();
}

async function show_single_view() {
    els.day_view.classList.add('hidden');
    els.month_view.classList.add('hidden');
    els.year_view.classList.add('hidden');
    els.single_view.classList.remove('hidden');

    let img = els.single_img;
    img.classList.add('hidden');
    els.single_loader.classList.remove('hidden');

    let year = date.year;
    let month = date.month;
    let day = date.day;
    let single_img_data = {};
    if (images_data?.[year]?.[month]?.[day]?.[img_i] !== undefined) {
        single_img_data = images_data[year][month][day][img_i];
        let size = Math.max(img.clientWidth, img.clientHeight);
        img.src = change_image_size(await get_image(single_img_data.id), size);
        els.single_name.textContent = single_img_data.name;
        els.single_date.textContent = date.toLocaleString('pt-BR', params={month: 'numeric', year: 'numeric', day: 'numeric' })
        els.single_path.textContent = single_img_data.path;
        img.classList.remove('hidden');
        els.single_loader.classList.add('hidden');
    }
    else {
        return;
    }

    let new_date = date.toPlainDateTime(second = `${String(single_img_data.h).padStart(2, '0')}:${String(single_img_data.m).padStart(2, '0')}:${String(single_img_data.s).padStart(2, '0')}`)

    //els.cal_label.textContent = new_date.toLocaleString('pt-BR', params={month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}) + ` (${date.toLocaleString('pt-BR', params={weekday: 'short'})})`;
    els.cal_label.textContent = new_date.toLocaleString('pt-BR', params={ hour: 'numeric', minute: 'numeric', second: 'numeric'});
}

document.addEventListener('DOMContentLoaded', async () => {
    els = {
        body: document.body,
        light_icon: document.getElementById('light-mode-icon'),
        dark_icon: document.getElementById('dark-mode-icon'),

        month_view: document.getElementById('month-view'),
        month_weeks: document.getElementById('month-week-box'),
        month_days: document.getElementById('month-days-box'),
        
        year_view: document.getElementById('year-view'),
        year_months: document.getElementById('year-months-box'),
        
        day_view: document.getElementById('day-view'),
        day_image_list: document.getElementById('day-images'),
        day_back: document.getElementById('day-back-button'),

        single_view: document.getElementById('single-view'),
        single_img: document.getElementById('single-img'),
        single_loader: document.getElementById('single-loader'),
        single_name: document.getElementById('single-name'),
        single_date: document.getElementById('single-date'),
        single_path: document.getElementById('single-path'),
        single_back: document.getElementById('single-back-button'),

        prev_date: document.getElementById('prev-date'),
        next_date: document.getElementById('next-date'),
        cal_label: document.getElementById('cal-label'),

        update_images: document.getElementById('update-images'),
        change_folder: document.getElementById('change-folder'),
        curr_folder_label: document.getElementById('curr-folder-label'),
        light_dark_mode: document.getElementById('light-dark-mode'),
    
        select_folder_box: document.getElementById('select-folder-box'),
        select_folder_close: document.getElementById('select-folder-close'),
        select_link_input: document.getElementById('select-folder-link-input'),
        select_link_button: document.getElementById('select-folder-link-submit'),
        select_link_loader: document.getElementById('select-folder-link-loader')
    };
    els.day_back.addEventListener('click', () => {selected_month(null);});
    els.single_back.addEventListener('click', () => {selected_day(null);});

    els.prev_date.addEventListener('click', () => {change_date(-1)});
    els.next_date.addEventListener('click', () => {change_date(1)});
    els.update_images.addEventListener('click', async () => {update_images_data()});
    els.change_folder.addEventListener('click', () => {els.select_folder_box.classList.remove('hidden')});
    els.select_folder_close.addEventListener('click', () => {hide_select_folder_box()});

    els.select_link_button.addEventListener('click', async () => {select_folder('link')});

    show_month_weeks(els.month_weeks);

    curr_token = await new Promise(r => chrome.identity.getAuthToken({ interactive: false }, r));

    chrome.storage.local.get(['images_data'], (result) => {
        images_data = result.images_data || {};
        find_first_last_dates();
        show_view();
    });
    chrome.storage.local.get(['folder_id'], async (result) => {
        FOLDER_ID = result.folder_id || null;
        if (FOLDER_ID) {
            els.curr_folder_label.textContent = "Loading folder...";
            els.curr_folder_label.textContent = await get_folder_name(FOLDER_ID);
        }
    });

    if (localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) {
        els.body.classList.add("dark-mode");
        els.light_icon.classList.add('hidden');
    }
    else {
        els.dark_icon.classList.add('hidden');
    }
    els.light_dark_mode.addEventListener('click', toggle_light_dark_mode);
});

window.addEventListener('resize', () => {
    justify_day_view(TARGET_HEIGHT, GAP);
});